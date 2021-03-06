var stompClient = null;

function setConnected(connected) {
    $("#connect").prop("disabled", connected);
    $("#disconnect").prop("disabled", !connected);
    if (connected) {
        $("#conversation").show();
    }
    else {
        $("#conversation").hide();
    }
    $("#greetings").html("");
}

function connect() {
    var token = $("#token").val();
    var projectId = $("#project").val();
    // var socket = new SockJS('/msg-center/dfocus')
    var socket = new SockJS('http://localhost:35006/change-manager')
    stompClient = Stomp.over(socket);
    // stomp.heartbeat.outgoing = 20000; //若使用STOMP 1.1 版本，默认开启了心跳检测机制（默认值都是10000ms）
    // stomp.heartbeat.incoming = 0; //客户端不从服务端接收心跳包
    stompClient.connect({
        token: token,
        userId: '123',
        projectId: projectId
    }, connectCallback, errorCallback);
}

//连接成功时的回调函数
function connectCallback() {

    setConnected(true);

    var project = $("#project").val();
    var topic = $("#topic").val();

    // 订阅广播消息
    stompClient.subscribe('/topic/' + project + '/' + topic, function (greeting) {
        showGreeting(JSON.parse(greeting.body).content);
    });

    // 订阅广播消息
    stompClient.subscribe('/topic/terminal/message', function (greeting) {
        showGreeting(JSON.parse(greeting.body).content);
    });


    // 订阅单用户消息
    stompClient.subscribe('/user/queue/' + project + '/', function (greeting) {
        showGreeting('UserMessage: ' + JSON.parse(greeting.body).content);
    });

    stompClient.subscribe('/user/queue/message', function (response) {
        alert("/user/queue/message 你接收到的消息为:" + response);
        showGreeting('UserMessage: ' + JSON.parse(greeting.body).content);
    });
}

var _breakReason;
var INVALID_TOKEN = 'INVALID_TOKEN';

//连接失败时的回调函数
function errorCallback(error) {
    // 错误取消重试
    console.log('connect fail:' + error)

    setConnected(false);

    if (_breakReason === INVALID_TOKEN) {
        // error callback will be called twice, that's why we record _breakReason with first call
        // we should just leave the callback if _breakReason from last call exist and match invalid_token
        return
    }

    // quit here since token is checked as invalid by server
    // no need to re-connect with same arguments
    if (
        error &&
        error.command === 'ERROR' &&
        error.headers &&
        error.headers.message &&
        error.headers.message.includes('auth_fail')
    ) {
        _setBreakReason(INVALID_TOKEN)
        console.log("auth fail, no reconnect")
        return
    }

    // if no auth fail, reconnect
    reconnect()
}

function reconnect() {
    console.log("30s retrying connect")
    setTimeout(() => {
        connect();
}, 30000
)
}

function _setBreakReason(reason) {
    _breakReason = reason

    // clear _breakReason in 2s
    setTimeout(() => {
        _breakReason = null
    }, 5000
)

}


function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect();
    }
    setConnected(false);
    console.log("Disconnected");
}


function sendName() {

    var reqData = JSON.stringify({
        'projectId': $("#project").val(),
        'topic': $("#topic").val(),
        'playLoad': '{"content":' + '"' + $("#name").val() + '"}',
        'updateTime': 1557676800000
    });

    $.ajax({
        url: '/msg-center/ws_message/topic',
        method: 'post',
        data: reqData,
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function (e) {
            console.log(e)
        },
        error: function (e) {
            console.log(e)
        }
    })
}

function showGreeting(message) {
    $("#greetings").append("<tr><td>" + message + "</td></tr>");
}

$(function () {
    $("form").on('submit', function (e) {
        e.preventDefault();
    });
    $("#connect").click(function () {
        connect();
    });
    $("#disconnect").click(function () {
        disconnect();
    });
    $("#send").click(function () {
        sendName();
    });
});