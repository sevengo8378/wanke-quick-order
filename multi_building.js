// ==UserScript==
// @name         Vanke
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        http://fang.vanke.com/*
// @grant        none
// ==/UserScript==

// todo
// 1. 测试倒计时刷新逻辑以及到时间时能否切换到抢房状态

var TARGET_HOUSES = [
    {
        name: "16号",
        rooms: ["702", "902", "1002", "1102", "1202"]
    },
    {
        name: "17号",
        rooms: ["701", "901", "1001", "1101", "1201"]
    },
    {
        name: "33号",
        rooms: ["701", "901", "1001", "1101", "1201", "1301", "1501", "1601", "1701", "1801"
              , "704", "904", "1004", "1104", "1204", "1304", "1504", "1604", "1704", "1804"
              , "1901", "2001", "2101", "601", "501"
              , "1904", "2004", "2104", "604", "504"]
    },
    {
        name: "31号",
        rooms: ["704", "904", "1004", "1104", "1204", "1304", "1504", "1604", "604"]
    }
];

/*var TARGET_HOUSES = [
    {
        name: "33号",
        rooms: ["202", "2602", "2603", "901", "902", "202"]
    },
    {
        name: "16号",
        rooms: ["702", "902"]
    },
    {
        name: "20号",
        rooms: ["201"]
    },
    {
        name: "17号",
        rooms: ["702", "902"]
    },
    {
        name: "31号",
        rooms: ["1303", "1304", "1201", '401']
    }
];*/

const VALID_ROOM_CLASS = 'status2 pageslide';
//const VALID_ROOM_CLASS = 'status5';
const AUTO_DETECT_TIMER = 50;
const AUTO_REFRESH_TIMER = 100;
const MAX_TOTAL_PRICE = 800000;
var continueAfterSuccess = false; //拍中一套后是否继续其他房源，真实环境需为true
var canButRefresh = false; //发现有一键选房按钮，但是原地刷新，用来测试刷新的功能,真实环境需为false
var realClick = false; //是否二次确认，真实环境下为true
var canSwitchBuilding = false; //当当前楼找不到合适房源时是否切换到下一幢楼,真实环境下为true

function checkOneBuilding(building, roomStart) {
    var allBuildings = getAllBuilding();
    log('当前楼： ' + building);
    var room = getAvaiableRoom(building, roomStart);
    if(room) {
        log('可选的房间： ' + room + ', 准备打开房间详情页');
        openRoomPage(room);
    } else if(canSwitchBuilding){
        var nextBuilding = getNextBuilding(building);
        log('Next building: ' + nextBuilding);
        if(nextBuilding && allBuildings.indexOf(nextBuilding) > 0) {
            clickNextBuilding(nextBuilding);
        }
    }
}

function openRoomPage(room) {
    crtRoom = room;
    var roomComp = getRoomComp(room);
    if(roomComp) {
        roomComp.click();
        startAutoDetect();
    }
}

function clickNextBuilding(building) {
    var btn = getBuildingTab(building);
    if(btn) {
        btn.click();
    }
}

function getNextBuilding(building) {
    for(var index=0; index<TARGET_HOUSES.length; index++) {
        if(TARGET_HOUSES[index].name === building && index+1 < TARGET_HOUSES.length) {
            return TARGET_HOUSES[index+1].name;
        }
    }
    return null;
}

function getMyRoomsByBuilding(building) {
    for(var index=0; index<TARGET_HOUSES.length; index++) {
        if(TARGET_HOUSES[index].name === building) {
            return TARGET_HOUSES[index].rooms;
        }
    }
    return null;
}

function getAvaiableRoom(building, startRoom) {
    var candidates = getMyRoomsByBuilding(building);
    if(!candidates || candidates.length === 0) {
        return null;
    }
    var startRoomIndex = startRoom && candidates.indexOf(startRoom) >= 0 ? candidates.indexOf(startRoom) + 1 : 0;
    for(var index=startRoomIndex; index<candidates.length; index++) {
        var room = candidates[index];
        if(isRoomValid(room)) {
            return room;
        }
    }
    return null;
}

function isRoomValid(room) {
    var allValidRooms = document.getElementsByClassName(VALID_ROOM_CLASS);
    for(var index=0; index<allValidRooms.length; index++) {
        //console.log(allValidRooms[index].innerText + "  " + room);
        if(allValidRooms[index].innerText.indexOf(room) === 0) {
            log('check ' + room + ' true, 可选房间数: ' + allValidRooms.length);
            return true;
        }
    }
    log('check ' + room + ' false, 可选房间数: ' + allValidRooms.length);
    return false;
}

function getRoomComp(room) {
    var allValidRooms = document.getElementsByClassName(VALID_ROOM_CLASS);
    for(var index=0; index<allValidRooms.length; index++) {
        if(allValidRooms[index].innerText.indexOf(room) === 0) {
            return allValidRooms[index];
        }
    }
    return null;
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

function getAllBuilding() {
    var comps = document.getElementsByClassName('nametd');
    var buildings = [];
    for(var index=0; index<comps.length; index++) {
        var building = comps[index];
        if(building && building.innerText.indexOf('号') > 0) {
            buildings.push(building.innerText);
        }
    }
    return buildings;
}

function getBuildingTab(building) {
    var comps = document.getElementsByClassName('nametd');
    for(var index=0; index<comps.length; index++) {
        var tab = comps[index];
        //log(tab.innerText + ' ' + building);
        if(tab && tab.innerText == building) {
            return tab;
        }
    }
    return null;
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

/*function startDoubleDetect () {
    timer_doubleDetect = window.setInterval(doubleDetect, 100);
}
function stopDoubleDetect(){
    if (timer_doubleDetect !== null) {
        window.clearInterval(timer_doubleDetect);
    }
}*/

function detect () {
    //log('detect');
    
    var infoComp = document.getElementsByClassName('target_info');
    if(!(infoComp && infoComp[0])) {
        return;
    }
    var roomProps = getRoomProps(infoComp);
    log(roomProps, crtBuilding, crtRoom);
    if(!(roomProps && roomProps['总价'])) {
        return;
    }
    //刷新时上一间房的信息可能会残留
    if(!(roomProps.room && roomProps.room === crtRoom)) {
        return;
    }
    if(!(roomProps.building && roomProps.building === crtBuilding)) {
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
            if(!success) {
                checkOneBuilding(crtBuilding, crtRoom);
            }
        } else {
            log(roomProps.room + ' 总价为' + totalPrice.toString() + ', 超预算');
            checkOneBuilding(crtBuilding, crtRoom);
        }
        return;
    }

    var over = document.getElementsByClassName('add_price_over');
    if (over && over[0]) {
        log('发现 已成交，寻找下一个房源');
        stopAutoDetect();
        stopRefreah();
        checkOneBuilding(crtBuilding, crtRoom);
        return;
    }
    
    var notStarted = document.getElementsByClassName('add_price_start');
    if ((notStarted && notStarted[0]) || canButRefresh) {
        log('发现 倒计时，刷新房间详情页');
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

function checkActivityStart() {
    var countdownComp = document.getElementsByClassName('countdown');
    if(countdownComp && countdownComp[0] && countdownComp[0].children && countdownComp[0].children[0] && countdownComp[0].children[0].innerText) {
        var label = countdownComp[0].children[0] && countdownComp[0].children[0].innerText;
        var status = 0;
        if(label.indexOf('开始') >= 0) {
            status = -1;
        } else if(label.indexOf('结束') >= 0) {
            status = 1;
        }
        var seconds = parseInt(countdownComp[0].children[1].value);
        return { status: status, seconds: seconds };
    }
    return { status: 0};
}

function fillBuildingHrefInfo() {
    for(var index=0; index<TARGET_HOUSES.length; index++) {
        var tabComp = getBuildingTab(TARGET_HOUSES[index].name);
        if(tabComp) {
            TARGET_HOUSES[index].href = tabComp.href.trim() + '&nonewtabs=1';
        }
    }
}
function openAllBuildingTabs() {
    if(location.search.indexOf('nonewtabs') >= 0) {
        return;
    }
    var count = 0;
    for(var index=0; index<TARGET_HOUSES.length; index++) {
        if(TARGET_HOUSES[index].name != crtBuilding && TARGET_HOUSES[index].href) {
            openOneBuildingTab(index, count * 30);
            count++;
        }
    }
}

function openOneBuildingTab(index, delay) {
    var href = TARGET_HOUSES[index].href;
    setTimeout('open(\'' + href + '\')', delay);
}

var crtBuilding = getCrtBuilding();
fillBuildingHrefInfo();
var crtRoom;

var activity = checkActivityStart();
log(activity);
if(activity.status === -1) { //活动未开始,刷新页面
    var delay = 5000;
    if(activity.seconds >= 10) {
        delay = 5000;
    } else if(activity.seconds >= 5) {
        delay = 2000;
    } else if(activity.seconds >= 2) {
        delay = 1000;
    } else if(activity.seconds >= 1) {
        delay = 500;
    } else if(activity.seconds >= 0) {
        delay = 100;
    }
    setTimeout(function() {
        location.reload();
    }, delay);
} else if(activity.status === 1) { //活动已开始
    openAllBuildingTabs();
    checkOneBuilding(crtBuilding);
} else {
    log('没有活动');
}



