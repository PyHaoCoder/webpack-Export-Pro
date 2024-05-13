CryptoJS = require("crypto-js");


te = "https://www.zhihu.com/api/v4/creators/rank/hot?domain=0&limit=20&offset=60&period=day";
dc0 = "ABCadPmHexiPTiaRTc7WWvM8ExE5hGGTbm8=|1713386895";


t3 = function(tt) {
    var te = new URL(tt,"https://www.zhihu.com");
    return "" + te.pathname + te.search
}


function ty(e) {
    return CryptoJS.MD5(e).toString();
}

function ed(tt, te, tr, ti) {
    var ta = tr.zse93,
        tu = tr.dc0,
        tc = tr.xZst81,
        tf = t3(tt),
        td = "",
        tp = [ta, tf, tu, false, tc].filter(Boolean).join("+");
    return {
        source: tp,
        signature: export_func(1514)['ZP'](ty(tp))
    };
}


// 函数入口
function get_x96(te,dc0){
    var tS = dc0,
    tT = ed(te, undefined, {
        zse93: "101_3_3.0",
        dc0: tS,
        xZst81: null
    }, undefined),
    tO = tT.signature;
    return "2.0" + "_" + tO
}

// 生成知乎X-Zse-96参数
// 2.0_eeggzh2xr/gZ0iTiQTTIM9dy5OA5Y1B7QdMm6QcVfkroen7tz/Y/inguymquBRWo
console.log(get_x96(te,dc0));