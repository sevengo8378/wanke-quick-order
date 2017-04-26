// ==UserScript==
// @name         VankeSimple
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        http://fang.vanke.com/*
// @grant        none
// ==/UserScript==



const VALID_ROOM_CLASS = 'status2 pageslide';
//const VALID_ROOM_CLASS = 'status5';
const AUTO_DETECT_TIMER = 50;
const AUTO_REFRESH_TIMER = 100;
const MAX_TOTAL_PRICE = 10000000;
var continueAfterSuccess = false; //拍中一套后是否继续其他房源，真实环境需为true
var realClick = false; //是否二次确认，真实环境下为true
var canSwitchBuilding = false; //当当前楼找不到合适房源时是否切换到下一幢楼,真实环境下为true

var canButRefresh = true; //发现有一键选房按钮，但是原地刷新，用来测试刷新的功能,真实环境需为false
var refreshTimes = 0;
var maxRefreshTimes = 20;

function openRoomPage(room) {
    crtRoom = room;
    var roomComp = getRoomComp(room);
    if(roomComp) {
        roomComp.click();
        startAutoDetect();
    }
}

function getCrtBuilding() {
    var crtBuildingComp = document.getElementsByClassName('nametd current');
    if(!crtBuildingComp || !crtBuildingComp[0]) {
        return null;
    } else {
        crtBuildingComp = crtBuildingComp[0];
    }
    var text = crtBuildingComp.innerText;
    return text.indexOf('号') > 0 ? text : null;
}


var timer_detect;
var timer_doubleDetect;
var timer_refreah;

function startAutoDetect () {
    stopAutoDetect();
    timer_detect = window.setInterval(detect, AUTO_DETECT_TIMER);
}
function stopAutoDetect(){
    if (timer_detect !== null) {
        window.clearInterval(timer_detect);
    }
}

function detect () {
    //log('detect');
    
    var infoComp = document.getElementsByClassName('target_info');
    if(!(infoComp && infoComp[0])) {
        return;
    }
    var roomProps = getRoomProps(infoComp);
    log(roomProps);
    if(!(roomProps && roomProps['总价'])) {
        return;
    }
    
    var class_price = document.getElementsByClassName('quick_price');
    if (class_price && class_price[0] && !canButRefresh) {
        var totalPrice = roomProps['总价'];
        stopAutoDetect();
        stopRefreah();
        if(totalPrice <= MAX_TOTAL_PRICE) { //判断价格是否可接受
            log('发现 一键选房，点击，等待二次确认按钮');
            class_price[0].click();
            var success = doubleDetect();
        } else {
            log(roomProps.room + ' 总价为' + totalPrice.toString() + ', 超预算');
        }
        return;
    }

    var over = document.getElementsByClassName('add_price_over');
    if (over && over[0]) {
        log('发现 已成交，寻找下一个房源');
        stopAutoDetect();
        stopRefreah();
        return;
    }
    
    var notStarted = document.getElementsByClassName('add_price_start');
    if ((notStarted && notStarted[0]) || canButRefresh) {
        log('发现 倒计时，刷新房间详情页');
        if(canButRefresh && refreshTimes < maxRefreshTimes) {
            refreshTimes++;
            if(refreshTimes === maxRefreshTimes) {
                canButRefresh = false;
            }
        } 
        refresh();
	}
}

function doubleDetect () {
    // <a href="#" class="btn btn-default btn-primary">确定</a>
    var success = false;
    var class_confirm = document.getElementsByClassName('btn btn-default btn-primary');
    if (class_confirm && class_confirm[0]) {
        if(realClick) {
            class_confirm[0].click();
            var successComp = document.getElementsByClassName('quick_price_success');
            if(successComp && successComp[0] && !continueAfterSucces) {
                success = true;
            }
        }
        if(!continueAfterSuccess) {
            success = true;
        }
        log('恭喜选中房源');
    }
    return success;
}

function startRefresh() {
    stopRefreah();
    timer_refreah = window.setInterval(refresh, AUTO_REFRESH_TIMER);
}
function refresh() {
	var btn_refresh = document.getElementsByClassName("pageslideRefesh");
    if(btn_refresh && btn_refresh[0]){
        log('refresh');
        btn_refresh[0].click();
    }
}
function stopRefreah(){
    if (timer_refreah !== null) {
        window.clearInterval(timer_refreah);
    }
}

function getRoomProps(infoComp) {
    if(infoComp && infoComp[0]) {
        var properties = infoComp[0].innerText.split('\n');
        var propObj = {};
        for(var i=0; i<properties.length; i++) {
            var keyVal = properties[i].split(':');
            if(keyVal.length === 2) {
                propObj[keyVal[0].trim()] = keyVal[1].trim();
            }
        }
        if(propObj['总价'] && propObj['总价'].split('.').length === 2) {
            propObj['总价'] = parseInt(propObj['总价'].split('.')[0]);
        }
        if(propObj['编号'] && propObj['编号'].split('号').length === 2) {
            propObj.building = propObj['编号'].split('号')[0] + '号';
            propObj.room = propObj['编号'].split('号')[1];
        }
        return propObj;
    }
    return null;
}

function time() {
    var a = new Date();
    return a.toLocaleString() + "." + a.getMilliseconds();
}

function log() {
    var args = [];
    for(var i=0; i<arguments.length; i++) {
        args.push(arguments[i]);
    }
    args.unshift(time());
    console.log.apply(null, args);
}

startAutoDetect();





