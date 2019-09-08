let TAB_ID;
chrome.runtime.sendMessage({ text: "tabId?" }, tab => {
  TAB_ID = tab.tab;
});

const retry = 50;
const maxTime = 5000;
let retryTimes = 0;

const EVENT_KEY = location.href.match(/events\/(.*)\/regi/)[1];
let BASE_INFO;
const myStorage = {
  get: key => {
    const data = JSON.parse(localStorage.getItem("myStorage"));
    if (!data) return;
    return data[key];
  },
  set: (key, val) => {
    let data = JSON.parse(localStorage.getItem("myStorage")) || {};
    data[key] = val;
    localStorage.setItem("myStorage", JSON.stringify(data));
  },
  clear: () => {
    localStorage.removeItem("myStorage");
  }
};

const infoBox = (function() {
  var $boxWrapper = $("<div/>"),
    $infoBox = $("<div id='my_info_box'/>"),
    $statusBox = $('<div class="alert alert-warning">操作狀態：</>'),
    $status = $("<p>初始中</p>"),
    $actionStatusBox = $('<div class="alert alert-danger">搶票狀態：</>'),
    $actionStatus = $("<p></p>"),
    $actionSuccessBox = $('<div class="alert alert-success">搶票成功：</>'),
    $actionSuccess = $("<p></p>");
  $statusBox.append($status);
  $actionStatusBox.append($actionStatus);
  $actionSuccessBox.append($actionSuccess).hide();
  $infoBox.append($statusBox);
  $infoBox.append($actionStatusBox);
  $infoBox.append($actionSuccessBox);
  $boxWrapper.append($infoBox);
  $boxWrapper.css({
    position: "fixed",
    left: 0,
    top: "30px",
    width: "100%",
    maxWidth: "600px",
    zIndex: 999
  });
  $infoBox.css({
    margin: "10px auto",
    padding: "10px",
    width: "100%",
    background: "#fff",
    boxShadow: "0 0 5px #efefef",
    opacity: "0.8",
    borderRadius: "5px"
  });
  $("body").append($boxWrapper);
  return {
    status: $status,
    actionStatus: $actionStatus,
    actionSuccess: $actionSuccess
  };
})();

function init() {
  setTimeout(function() {
    if (document.getElementsByClassName("display-table").length === 0) {
      console.log("document not ready");
      if (retryTimes * retry > maxTime) {
        alert("kktix 外掛錯誤");
      } else {
        retryTimes++;
        init();
      }
    } else {
      console.log("start");
      infoBox.status.text("等待中");
      start();
    }
  }, 50);
}

init();

function start() {
  getRegisterInfo(EVENT_KEY);
  // location.reload();
  // goBuy();
}

function getRegisterInfo(event_key) {
  var url = `https://kktix.com/g/events/${event_key}/register_info`;
  $.get(url, {}, function(data) {
    if (!data.current_user) {
      alert("請先登入");
      return;
    }
    getBaseInfo(event_key);
  });
}

function getBaseInfo(event_key) {
  var url = `https://kktix.com/g/events/${event_key}/base_info`;
  $.get(url, {}, function(data) {
    BASE_INFO = data;
    displayTableClick();
    startBuy();
  });
}

function displayTableClick() {
  $(".display-table").click(function(event) {
    if (myStorage.get("tabId") && myStorage.get("tabId") != TAB_ID) {
      infoBox.status.text(
        "其他頁面正在搶票，請保持一個頁面搶票，避免造成鎖住ip購買。"
      );
      return;
    }

    const ticket_id = this.id.split("_").pop();
    const ticket = BASE_INFO.eventData.tickets.find(
      ticket => ticket.id == ticket_id
    );
    const text = `你選擇了 ${ticket.name} $${ticket.price.cents / 100} ${
      ticket.price.currency
    }, 需要幾張呢？ \n 最多購買 ${ticket.max_to_buy} 張。`;
    const quantity = prompt(text);
    if (isNaN(quantity) || quantity > ticket.max_to_buy) {
      alert("請輸入正確的數字");
    } else {
      myStorage.set("eventKey", EVENT_KEY);
      myStorage.set("ticket", ticket);
      myStorage.set("quantity", quantity);
      myStorage.set("tabId", TAB_ID);
      startBuy();
    }

    // id: 210903
    // max_to_buy: 1
    // name: "子彈卡會員票"
    // need_invitation_code: false
    // price: {cents: 80000, currency: "TWD"}
    // qualifications: [{
    //   data: {},
    //   id: 25004,
    //   name: "請填入子彈卡會員帳號email。（請注意，是完整且一模一樣的英文/號碼/符號。）",
    //   type: "member_code"
    // }]
    // start_at: "2019-09-04T04:00:00Z"
    // tax_free: false
    // unit_to_buy: 1
  });
}

function startBuy() {
  const eventKey = myStorage.get("eventKey");
  const ticket = myStorage.get("ticket");
  const quantity = myStorage.get("quantity");
  if (!eventKey || !ticket || !quantity) return;
  if (eventKey !== EVENT_KEY) {
    myStorage.clear();
    return;
  }
  console.log("tab_id", TAB_ID, myStorage.get("tabId"));
  if (myStorage.get("tabId") && myStorage.get("tabId") != TAB_ID) {
    infoBox.status.text(
      "其他頁面正在搶票，請保持一個頁面搶票，避免造成 ip 鎖住。"
    );
    return;
  }
  let statusText = `你選擇了 ${ticket.name} $${ticket.price.cents / 100} ${
    ticket.price.currency
  },  ${quantity} 張。`;
  infoBox.status.text(statusText);
  console.log(eventKey);
  console.log(ticket);
  console.log(quantity);

  const startTime = new Date(ticket.start_at);
  if (startTime > new Date()) {
    statusText += ` 將於 ${new Date(ticket.start_at).toLocaleString()} 開賣`;
    infoBox.status.text(statusText);

    setInterval(function() {
      let actionStatusText = `等待開賣，目前時間：${new Date().toLocaleString()}`;
      infoBox.actionStatus.text(actionStatusText);
      if (startTime <= new Date()) {
        location.reload();
      }
    }, 50);
  } else {
    $(".display-table").off("click");
    const $target_ticket = $(`#ticket_${ticket.id}`);

    if (!$target_ticket.find(".plus")[0]) {
      infoBox.actionStatus.text(`無該票券購買按鈕，即將重新整理頁面`);
      location.reload();
      return;
    }

    if (!$("#person_agree_terms").prop("checked")) {
      $("#person_agree_terms").click();
    }
    for (let i = 0; i < quantity; i++) {
      $target_ticket.find(".plus").click();
    }
    if ($('input[name$="captcha_answer"]')[0]) {
      infoBox.actionStatus.text(`請先回答問題`);
      $('input[name$="captcha_answer"]').focus();
      $('input[name$="captcha_answer"]').on("keydown", function(e) {
        if (e.keyCode === 13) {
          infoBox.actionStatus.text(`搶票中`);
          goBuy();
        }
      });
    } else {
      infoBox.actionStatus.text(`搶票中`);
      goBuy();
    }
  }
}

function goBuy() {
  setTimeout(function() {
    if ($(".custom-captcha.error .ng-empty")[0]) {
      infoBox.actionStatus.text(`請先回答問題`);
      $('input[name$="captcha_answer"]').focus();
      return;
    }
    if (!$('button:contains("下一步")').prop("disabled")) {
      $('button:contains("下一步")').click();
    }
    goBuy();
  }, 100);
}

var disablerFunction = function() {
  window.alert = function alert(msg) {
    console.log("Hidden Alert " + msg);
  };
};
var disablerCode = "(" + disablerFunction.toString() + ")();";
var disablerScriptElement = document.createElement("script");
disablerScriptElement.textContent = disablerCode;

document.documentElement.appendChild(disablerScriptElement);
disablerScriptElement.parentNode.removeChild(disablerScriptElement);
