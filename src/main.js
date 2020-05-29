/**
 * QiitaトレンドBOT
 */
const LINE_NOTIFY_TOKEN = '*****'; // LINE NOTIFYのアクセストークン
const SSID_QIITA_TREND = '*****'; // QiitaトレンドのスプレッドシートのID
const SSN_QIITA_TREND = '*****'; // Qiitaトレンドのスプレッドシートのシート名
const TITLE_MAX_LENGTH = 20; // 記事タイトル最大長
const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * メイン処理
 */
function main() {
    try {
        let itemList = [];
        let spreadsheet = SpreadsheetApp.openById(SSID_QIITA_TREND);
        let sheet = spreadsheet.getSheetByName(SSN_QIITA_TREND);
        let lastRow = sheet.getLastRow();
        if (0 < lastRow) {
            itemList = sheet.getRange(1, 1, sheet.getLastRow(), 3).getValues();
            itemList = itemList.map((row) => {
                return {
                    url: row[0],
                    createDt: row[1],
                    title: row[2]
                }
            });
        }

        let trendList = [];
        let srcHtml = unEscapeHTML(getTrendInfo());
        let srcBlock = Parser.data(srcHtml).from('<div data-hyperapp-app="Trend" data-hyperapp-props="').to('"></div>').build();
        let srcBlockObj = JSON.parse(srcBlock);
        let srcTrendList = srcBlockObj.trend.edges
        for (let i in srcTrendList) {
            let srcTrend = srcTrendList[i];
            let title = srcTrend.node.title;
            let url = `https://qiita.com/${srcTrend.node.author.urlName}/items/${srcTrend.node.uuid}`;
            let createDt = srcTrend.node.createdAt;
            let isExist = false;
            for (let j in itemList) {
                let item = itemList[j];
                if (url == item.url) {
                    isExist = true;
                }
            }
            if (!isExist) {
                trendList.push({
                    title: title,
                    url: url,
                    createDt: createDt
                });
            }
        }

        if (0 < trendList.length) {
            let nowDt = new Date();
            let dt = Utilities.formatDate(nowDt, 'Asia/Tokyo', `MM/dd(${WEEKDAY[nowDt.getDay()]})`);
            let message = `\n今日のQiitaトレンドだよ!!\n\n--- ${dt} ----\n\n`;
            for (let i in trendList) {
                let trend = trendList[i];
                message += `${omit(trend.title)}\n`;
                message += `${trend.url}\n\n`;
                sheet.appendRow([trend.url, trend.createDt, trend.title]);
            }
            sendLineNotify(message);
        }
    } catch (e) {
        console.error(e.stack);
    }
}

/**
 * HTMLのEscapeしない
 * @param {String} str 
 */
function unEscapeHTML(str) {
    return str.replace(/(&lt;)/g, '<').replace(/(&gt;)/g, '>').replace(/(&quot;)/g, '"').replace(/(&#39;)/g, "'").replace(/(&amp;)/g, '&');
};

/**
 * 文字列を省略する
 * @param {String} str 
 */
function omit(str) {
    if (TITLE_MAX_LENGTH < str.length) {
        return str.slice(0, TITLE_MAX_LENGTH) + '...';
    } else {
        return str;
    }
}

/**
 * トレンド情報を取得する
 */
function getTrendInfo() {
    let url = `https://qiita.com/`;
    let options = {
        'method': 'get',
    };
    let response = UrlFetchApp.fetch(url, options);
    return response.getContentText('UTF-8');
}

/**
 * LINEにメッセージを送信する
 * @param {String} message メッセージ 
 */
function sendLineNotify(message) {
    let url = 'https://notify-api.line.me/api/notify';
    let options = {
        'method': 'post',
        'headers': {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Authorization': `Bearer ${LINE_NOTIFY_TOKEN}`
        },
        'payload': `message=${message}`
    };
    let response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText('UTF-8'));
}