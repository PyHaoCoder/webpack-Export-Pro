// 环境代理器

// 1.定义常见的DOM环境
window = global;
document = {}
navigator = {}
location = {}
history = {}
screen = {}
canvas = {}
Context2D = {}

localStorage = {
    getItem: function (key) {
        return this[key]
    },
    setItem: function (key, val) {
        this[key] = val
    },
    removeItem: function (key) {
        delete this[key]
    }
},sessionStorage = localStorage

// 2.补环境（在这里修改环境）
Math.random = function () {
    return 1
}

alert = function(){}
window.name = ''
window.global = undefined
navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
navigator.webdriver = false

location = {
    "ancestorOrigins": {},
    "href": "https://www.zhihu.com/knowledge-plan/hot-question/hot/0/day",
    "origin": "https://www.zhihu.com",
    "protocol": "https:",
    "host": "www.zhihu.com",
    "hostname": "www.zhihu.com",
    "port": "",
    "pathname": "/knowledge-plan/hot-question/hot/0/day",
    "search": "",
    "hash": ""
}

document.toString = function(){
    return '[object HTMLDocument]'
}

navigator.toString = function(){
    return '[object Navigator]'
}

location.toString = function(){
    return 'https://www.zhihu.com/knowledge-plan/hot-question/hot/0/day'
}
history.toString = function(){
    return '[object History]'
}
screen.toString = function(){
    return '[object Screen]'
}


document.createElement = function(arg){
    console.log('document.createElement',arguments)
    if (arg==='canvas'){
        return canvas
    }
}
canvas.getContext = function(arg){
    console.log('canvas.getContext',arguments)
    if (arg==='2d'){
        return Context2D
    }
}
Context2D.toString = function(){
    return '[object CanvasRenderingContext2D]'
}

document.getElementById = function(arg){
    console.log('document.getElementById',arguments)
}

document.getElementsByClassName = function(arg){
    console.log('document.getElementsByClassName',arguments)
}

// 3.返回值处理
function reductionValue(value) {
    const max_length = 70  // 默认显示 70 个字符
    if (typeof value === 'string') {
        return value.length > max_length ? value.substring(0, max_length) + '...' : value
    } else {
        return typeof value === 'function' || typeof value === 'object' ? typeof value : value
    }
}

// 4.创建Proxy代理的方法
function createProxy(targets) {
    for (let i = 0, target; i < targets.length; i++) {
        target = targets[i]
        eval(`${target} = new Proxy(${target}, {
            get: function (target, p, receiver) {
                let value = Reflect.get(target, p, receiver)
                if (typeof p != "symbol" && p!=='apply' && p!=='x') {
                    console.log(\`Get ${target}.\$\{p\} -->\`,reductionValue(value))
                }
                return value
            },
            set: function (target, p, newValue, receiver) {
                console.log(\`Set ${target}.\$\{p\} -->\`,reductionValue(newValue))
                return Reflect.set(target, p, newValue, receiver)
            }
        })`)
    }
}

// 5.创建代理对象
targets = ["window", "document", "navigator", "location", "history", "screen","canvas","Context2D"]
createProxy(targets)