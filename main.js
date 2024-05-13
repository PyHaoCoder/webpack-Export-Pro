/*******************************************************
 * 模块名称：main.js
 * 作者：阿浩Python
 * 日期：2024-04-28
 *
 * 描述：
 * 本脚本用于自动化生成webpack打包所需的模块导出。它运用Babel工具集对源代码进行解析与转换。
 *
 * 免责声明：
 * 本脚本仅限于AST技术学习，严禁非法使用，违者承担一切后果。
 *******************************************************/

const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const generator = require('@babel/generator').default
const types = require('@babel/types')
const fs = require('fs')

process.argv.length > 2 ? loaderFile = process.argv[2] : loaderFile = __dirname + '/main/loader.js'
process.argv.length > 3 ? modulesFile = process.argv[3] : modulesFile = __dirname + '/main/modules.js'
process.argv.length > 4 ? executorFile = process.argv[4] : executorFile = __dirname + '/main/executor.js'

// 读取输入文件（加载器、模块、执行器）或使用默认路径
loaderCode = fs.readFileSync(loaderFile, {encoding: 'utf-8'})
modulesCode = fs.readFileSync(modulesFile, {encoding: 'utf-8'})
executorCode = fs.readFileSync(executorFile, {encoding: 'utf-8'})
proxyCode = fs.readFileSync(__dirname + '/main/proxy.js', {encoding: 'utf-8'})


// 配置信息
execFuncName = 'zr'  // 执行器中调用加载器的函数名
bootProxy = true  // 是否启动环境代理模式


console.time("处理完毕，耗时");

// 初始化模块代码
if (modulesCode[0] === '{') {
    modulesCode = '(' + modulesCode + ')'
}

// 解析JavaScript代码到抽象语法树（AST）进行转换
var loaderAst = parser.parse(loaderCode)
var modulesAst = parser.parse(modulesCode)
var executorAst = parser.parse(executorCode)

// 定位加载器自执行函数体和参数节点
let loaderBody, loaderArguments,loaderParams;
if (loaderAst.program.body[0].expression.type === 'UnaryExpression') {
    loaderBody = loaderAst.program.body[0].expression.argument.callee.body.body
    loaderArguments = loaderAst.program.body[0].expression.argument.arguments
    loaderParams = loaderAst.program.body[0].expression.argument.callee.params
} else {
    loaderBody = loaderAst.program.body[0].expression.callee.body.body
    loaderArguments = loaderAst.program.body[0].expression.arguments
    loaderParams = loaderAst.program.body[0].expression.callee.params
}

// 遍历和删除自执行函数体中调用方法的节点
for (body of loaderBody) {
    if (!types.isExpressionStatement(body) || !types.isCallExpression(body.expression)) {
        continue
    }
    // 删除调用方法的节点
    loaderBody.splice(loaderBody.indexOf(body), 1)
}

// 定位加载器函数节点
let exportName, moduleName;
traverse(loaderAst, {
    FunctionDeclaration(path) {
        if (!path.toString().includes('exports:')) {
            return
        }
        let {id, body} = path.node
        let length = body.body.length

        // 获取 ReturnStatement 类型节点的子节点，object.name 代表对象名称，property.name 代表下标名称
        let {object, property} = body.body[length - 1].argument.expressions[0].callee.object

        // 如果自执行函数没有参数，则添加模块对象名称
        if (loaderParams.length === 0) {
            loaderParams.push(types.identifier(object.name))
        }

        // 创建吐模块节点，不使用的话注释代码
        let consoleNode = types.expressionStatement(
            types.callExpression(
                types.memberExpression(
                    types.identifier('console'),
                    types.identifier('log')
                ),
                [types.identifier(property.name)]
            )
        )
        types.addComment(consoleNode, 'leading', '自动吐模块') // 添加注释
        body.body.splice(length - 1, 0, consoleNode)  // 添加节点到加载器函数体内

        // 创建存储函数对象的赋值节点
        let assignmentNode = types.expressionStatement(
            types.assignmentExpression('=',
                types.memberExpression(
                    types.identifier('exec_funcs'),
                    types.identifier(property.name),
                    true
                ),
                types.memberExpression(
                    types.identifier(object.name),
                    types.identifier(property.name),
                    true
                ),
            )
        )
        types.addComment(assignmentNode, 'leading', '将调用的模块存储到全局对象中') // 添加注释
        body.body.splice(length - 1, 0, assignmentNode)  // 添加节点到加载器函数体内

        // 获取加载器的函数名称和模块对象名称
        exportName = id.name
        moduleName = object.name

        // 既然已经找到所需节点，可以停止遍历
        // path.stop();
    },
    MemberExpression(path) {
        let {object} = path.node
        if (object.name === 'self') {
            object.name = 'window'
        }
    }
})

// 防止模块对象被置空
traverse(loaderAst, {
    VariableDeclarator(path) {
        let {id} = path.node
        if (id.name === moduleName) {
            id.name = '_'
        }
    }
})

// 判断是否找到加载器函数
if (!exportName) {
    throw "加载器函数定位失败"
}

// 变量赋值方法
function createGlobalVariableAssigment(varName, value) {
    return types.expressionStatement(
        types.assignmentExpression(
            '=',
            types.identifier(varName),
            types.identifier(value)
        )
    );
}

// 变量声明方法
function createGlobalVariableDeclaration(kind, varName) {
    return types.variableDeclaration(
        kind, [types.variableDeclarator(types.identifier(varName))]
    );
}

// 添加全局变量export_func和exec_funcs
loaderAst.program.body.unshift(
    createGlobalVariableDeclaration('var', 'export_func'),
    createGlobalVariableDeclaration('var', 'exec_funcs')
);

// 添加全局变量window和navigator（如果代理模式为false）
if (!bootProxy) {
    loaderAst.program.body.unshift(
        createGlobalVariableAssigment('window', 'global'),
        createGlobalVariableAssigment('navigator', '{}')
    );
}else{
    eval(proxyCode) // 将代理代码加载到环境中
}

// 导出加载器函数和存储函数对象
loaderBody.push(
    createGlobalVariableAssigment('export_func', exportName),
    createGlobalVariableAssigment('exec_funcs', '{}')
)

// 替换执行器中调用加载器的节点
traverse(executorAst, {
    "CallExpression|NewExpression"(path) {
        let {callee, arguments} = path.node
        if (types.isIdentifier(callee)) {
            // 判断是否为加载器名称
            if (callee.name !== exportName && callee.name !== execFuncName) {
                return
            }
            // 判断传递的参数是否符合条件
            if (arguments.length !== 1 || (!types.isNumericLiteral(arguments[0]) && !types.isStringLiteral(arguments[0]))) {
                return
            }
            callee.name = 'export_func'

        } else if (types.isMemberExpression(callee)) {
            let {object, property} = callee
            // 判断是否为加载器名称
            if ((object.name !== exportName && object.name !== execFuncName) || property.name !== 'n') {
                return
            }
            // 判断传递的参数是否符合条件
            if (arguments.length !== 1 || !types.isIdentifier(arguments[0])) {
                return
            }
            object.name = 'export_func'
        }
    }
})
executorCode = generator(executorAst).code


// 将所有模块节点添加到数组节点中
let modulesNode = [], properties;
if (modulesAst.program.body[0].expression.type === "ObjectExpression") { // 如果存放模块的是一个纯对象
    properties = modulesAst.program.body[0].expression.properties
} else if (modulesAst.program.body[0].expression.arguments[0].elements[1].type === "ObjectExpression") {  // 如果 webpackJsonp 存放模块的是对象
    properties = modulesAst.program.body[0].expression.arguments[0].elements[1].properties
} else {
    properties = modulesAst.program.body[0].expression.arguments[0].elements[1].elements // 如果 webpackJsonp 存放模块的是数组
}

properties.forEach(function (obj, index) {
    // 如果是模块节点是函数类型
    if (types.isFunctionExpression(obj)) {
        obj = types.objectProperty(types.numericLiteral(index), obj)
    }
    // 如果模块节点为null值，返回一个空函数用来占位
    else if (obj === null) {
        obj = types.objectProperty(types.numericLiteral(index), types.functionExpression(null, [], types.blockStatement([], [])))
    }
    modulesNode.push(obj)
})


// 将所有模块添加到加载器自执行函数中
if (loaderArguments.length > 0 && loaderArguments[0].type === "ObjectExpression") {
    let combinedArray = loaderArguments[0].properties.concat(modulesNode); // 和加载器中已有的模块合并
    loaderArguments.splice(0, 1, types.objectExpression(combinedArray))
} else {
    loaderArguments.splice(0, 1, types.objectExpression(modulesNode))
}

// 保存测试文件
// fs.writeFileSync('/test.js', generator(loaderAst).code, () => {
// })

// 将加载器自执行函数加载到环境中
eval(generator(loaderAst).code)

// 通过加载器执行代码
eval(executorCode)
console.log()

// 查看加载器中被调用的模块
// console.log(exec_funcs)


// 返回对象的字符串形式
function objectToString(obj) {
    let objString = '({\n';
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            if (typeof obj[prop] === 'function') {
                objString += `  "${prop}": ${obj[prop].toString()},\n`;
            } else {
                objString += `  "${prop}": ${JSON.stringify(obj[prop])},\n`;
            }
        }
    }
    objString += '})';
    return objString;
}

// 将执行函数存储的对象转换为字符串形式
let objString = objectToString(exec_funcs);

// 将转换后的字符串重新解析为AST
funcsAst = parser.parse(objString)

// 将原本的模块替换成被调用的模块
let funcsNode = []
funcsAst.program.body[0].expression.properties.forEach(function (obj) {
    funcsNode.push(obj)
})
loaderArguments.splice(0, 1, types.objectExpression(funcsNode))

console.timeEnd("处理完毕，耗时");

// 返回最终的结果
let result;
if (!bootProxy){
    result = generator(loaderAst).code + ';\r\n\r\n//执行代码;\r\n' + executorCode
}else {
    result = proxyCode + ';\r\n\r\n' + generator(loaderAst).code + ';\r\n//执行代码;\r\n' + executorCode
}


// 写入最终的结果到文件
// 生成JS代码并写入 result.js 文件
fs.writeFile(__dirname + '/result.js', result, (err) => {
    if (err) {
        return console.error(`写入文件出错: ${err.message}`);
    }
    console.log('结果文件已成功生成：result.js');
});
