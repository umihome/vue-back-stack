/* eslint-disable */
import Vue from 'vue'
// import { type } from 'os'

let routerLinks = []
let historyStash = []
let _router = null
let _routers = null

const init = (routers, router) => {
  generateRouterLinks(routers)
  _router = router
  Vue.prototype.$back = customBack
}

/**
 * 1. routers 扁平化. 因为 routers 可能包含多层 children，遍历较麻烦，所以把routers修改成一层数组
 * 2. 强制要求必须包含参数 possiblePreviousPages
 * 3. 存储routers
 * 4. 生成routerLinks.
 * 5. routerLinks 根据长度排序
 */
const generateRouterLinks = (routers) => {
  routers = routers || []

  // routers 扁平化
  const getRouter = (routers) => {
    let result = []
    for (let i = 0; i < routers.length; i++) {
      let router = routers[i]
      if (router.children) {
        let childrenRouters = getRouter(router.children)
        result = result.concat(childrenRouters)
      } else {
        result.push(router)
      }
    }
    return result
  }
  let rs = getRouter(routers)

  // 强制要求必须包含参数 possiblePreviousPages
  for (let i = 0; i < rs.length; i++) {
    if (!rs[i].possiblePreviousPages) {
      console.log(rs[i])
      console.error('router 缺少 possiblePreviousPages 参数')
      return
    }
  }

  //  存储routers
  _routers = routers

  // 生成 routerLinks
  // 1. 先剥离出没有上级回退页面的router
  // 2. 生成链
  let baseRouterLinks = []
  for (let i = 0; i < rs.length; i++) {
    let r = rs[i]
    let { possiblePreviousPages, name } = r
    if (possiblePreviousPages.length <= 0) {
      baseRouterLinks.push([name])
    }
  }
  const getNextLinks = (link, routers) => {
    let lastItem = link[link.length - 1]
    let result = []
    routers.forEach(router => {
      let { possiblePreviousPages, name } = router
      if (possiblePreviousPages.indexOf(lastItem) >= 0) {
        let l = [].concat(link)
        l.push(name)
        result.push(l)
      }
    })

    return result
  }

  const getRouterLinks = (baseRouterLinks) => {
    let result = []
    let numNoNext = 0
    for (let i = 0; i < baseRouterLinks.length; i++) {
      let routerLink = baseRouterLinks[i]
      let nextLinks = getNextLinks(routerLink, routers)
      if (nextLinks.length <= 0) {
        numNoNext++
        result = result.concat([routerLink])
      } else {
        result = result.concat(nextLinks)
      }
    }
    if (numNoNext === baseRouterLinks.length) {
      return result
    } else {
      return getRouterLinks(result)
    }
  }

  routerLinks = getRouterLinks(baseRouterLinks)

  // routerLinks 根据长度排序
  for (let i = 0; i < routerLinks.length - 1; i++) {
    for (let j = i + 1; j < routerLinks.length; j++) {
      let len = routerLinks[i] ? routerLinks[i].length : 0
      let innerLen = routerLinks[j] ? routerLinks[j].length : 0
      if (innerLen > len) {
        let temp = routerLinks[i]
        routerLinks[i] = routerLinks[j]
        routerLinks[j] = temp
      }
    }
  }
}

const push = (to, from) => {
  if (!isBack(to)) {
    let before_history_len = history.length
    let to_path = to.path
    let timer = setInterval(() => {
      if (location.pathname === to_path) {
        clearInterval(timer)
        let after_history_len = history.length
        if (after_history_len === before_history_len && historyStash.length > 0) { // replace
          historyStash.pop()
        }
        historyStash.push(to)
      }
    }, 30)
  } else {
    historyStash.pop()
  }
}

const isBack = (to, from) => {
  if (historyStash.length <= 0) {
    return false
  }
  if (historyStash.length >= 2 && to.name === historyStash[historyStash.length - 2].name) {
    return true
  }
}

const customBack = (params, fromName) => {
  if (historyStash.length === 0) { // 应该不会出现这种情况，但实际情况是会出现
    if (fromName === 'login') {
      _router.replace({name: 'home'})
    } else {
      _router.back()
    }
    return
  }
  let curName = historyStash[historyStash.length - 1].name
  let prevName = historyStash.length >= 2 ? historyStash[historyStash.length - 2].name : ''
  if (find(curName, prevName)) {
    _router.back()
  } else {
    _router.push(Object.assign(params || {}, { name: getPrev(curName) }))
  }
}

const find = (curName, prevName) => {
  let result = null
  routerLinks.forEach(link => {
    if (prevName) {
      let str = link.join(',')
      if (str.indexOf(prevName + ',' + curName) >= 0) {
        result = link
      }
    }
  })
  return result
}

const getPrev = (curName) => {
  for (let i = 0; i < routerLinks.length; i++) {
    let routerLink = routerLinks[i]
    let index = routerLink.indexOf(curName)
    console.log('getPrev : ' + JSON.stringify(routerLink))
    console.log('getPrev: ' + index)
    if (index > 0) {
      return routerLink[index - 1]
    } else if (index === 0) {
      return routerLink[index]
    } else {
      return 'home'
    }
  }
  return 'home'
}

export default {
  init,
  push,
  customBack
}
