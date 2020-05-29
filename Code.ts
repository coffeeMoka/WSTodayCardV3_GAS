const wsURL: string = "https://ws-tcg.com/todays-card/";
const wsFolder: GoogleAppsScript.Drive.Folder = DriveApp.getFolderById("フォルダID");
const SLACKMESSAGE: string = "https://hooks.slack.com/services/slackのメッセージ投稿先";
const SLACKTOKEN: string = "slackのトークン";
const POSTCHANNEL: string = "slackの投稿するチャンネル";
const SLACKIMAGE: string = "slackのファイルアップロード先";
const DISCORDENDPOINT: string = "https://discordapp.com/api/webhooks/送信先/";
const DISCORDTOKEN: string = "discordのトークン";
const DISCORDCHANNEL: string = "#today-cards";
const DISCORDUSERNAME: string = "Today Bot";
const DISCORDPARSE: string = "full";

function doPost(e) {
    const today = new Date();
    if(DateUtil.IsHoliday(today)) {
        return;
    }
    const jsonString: string = e.postData.contents;
    postTodayCards(jsonString);
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(JSON.stringify({ message: "success!" }));
    return output;
}

function postTodayCards(json: string): void {
    const obj = JSON.parse(json);
    const imageList = obj.image;
    const titleList = obj.title;
    const message: string = "今日のカードが更新されました！\n今日は" + imageList.length + "枚です！";
    postSlackMessage(message);
    postDiscordMessage(message);
    getProducts(titleList);
    const dt: Date = new Date();
    const today: string = dt.getFullYear() + "/" + setDigits(dt.getMonth() + 1, 2) + "/" + setDigits(dt.getDate(), 2);
    const todayFolder: GoogleAppsScript.Drive.Folder = wsFolder.createFolder(today);
    for (let i: number = 0; i < imageList.length; i++) {
        const imagePath: string = imageList[i];
        const cardUrl: string = imagePath;
        const image: GoogleAppsScript.Base.Blob = getImage(cardUrl);
        postSlackImage(image);
        postDiscordImage(image);
        const saveName: string = "WS" + setDigits((i + 1), 2) + ".png";
        image.setName(saveName);
        SaveImage(image, todayFolder);
        Utilities.sleep(1000);
    }
    postDiscordMessage(todayFolder.getUrl());
}

function setTrigger(date: Date, funcName: string): void {
    ScriptApp.newTrigger(funcName).timeBased().at(date).create();
}

function deleteTrigger(funcName: string): void {
    const triggers: GoogleAppsScript.Script.Trigger[] = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
        if (trigger.getHandlerFunction() === funcName) {
            ScriptApp.deleteTrigger(trigger);
        }
    }
}

function postSlackMessage(postMessage: string): void {
    const payload = {
        text: postMessage,
        username: "今日のカード",
    };
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        headers: { "Content-type": "application/json" },
        method: "post",
        payload: JSON.stringify(payload),
    };
    UrlFetchApp.fetch(SLACKMESSAGE, options);
}

function postSlackImage(postImage: GoogleAppsScript.Base.Blob): void {
    const data = {
        channels: POSTCHANNEL,
        file: postImage,
        title: "今日のカード",
        token: SLACKTOKEN,
    };
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: "post",
        payload: data,
    };
    UrlFetchApp.fetch(SLACKIMAGE, options);
}

function postDiscordMessage(postMessage: string): void {
    const payload = getPayload(postMessage);
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = getOptions(payload);
    UrlFetchApp.fetch(DISCORDENDPOINT + DISCORDTOKEN, options);
}

function postDiscordImage(postImage: GoogleAppsScript.Base.Blob): void {
    const payload = getPayload(postImage);
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = getOptions(payload);
    UrlFetchApp.fetch(DISCORDENDPOINT + DISCORDTOKEN, options);
}

function getPayload(sendItem: any): object {
    if (typeof sendItem === "object") {
        return {
            channel: DISCORDCHANNEL,
            file: sendItem,
            parse: DISCORDPARSE,
            token: DISCORDTOKEN,
            username: DISCORDUSERNAME,
        };
    } else {
        return {
            channel: DISCORDCHANNEL,
            content: sendItem,
            parse: DISCORDPARSE,
            token: DISCORDTOKEN,
            username: DISCORDUSERNAME,
        };
    }
}

function getOptions(data: object): GoogleAppsScript.URL_Fetch.URLFetchRequestOptions {
    return {
        method: "post",
        muteHttpExceptions: true,
        payload: data,
    };
}

function getImage(imageUrl: string): GoogleAppsScript.Base.Blob {
    const response: GoogleAppsScript.URL_Fetch.HTTPResponse = UrlFetchApp.fetch(imageUrl);
    const fileBlob: GoogleAppsScript.Base.Blob = response.getBlob();
    return fileBlob;
}

function getHtml(getUrl: string): string {
    const response: GoogleAppsScript.URL_Fetch.HTTPResponse = UrlFetchApp.fetch(getUrl);
    const html: string = response.getContentText("UTF-8");
    return html;
}

function getProducts(titleList: any): void {
    let postMessage: string = "今日の更新タイトル\n";
    for (let i: number = 0; i < titleList.length; i++) {
        if (i !== 0) {
            postMessage += "\n";
        }
        postMessage += titleList[i];
    }
    postSlackMessage(postMessage);
    postDiscordMessage(postMessage);
}

function getMatchList(text: string, regex: RegExp): RegExpMatchArray {
    return text.match(regex);
}

function setDigits(num: number, length: number): string {
    return ("0000000000000" + num).slice(-length);
}

function SaveImage(image: GoogleAppsScript.Base.Blob, folder: GoogleAppsScript.Drive.Folder): void {
    folder.createFile(image);
}

function deleteFolders(): void {
    const childFolders: GoogleAppsScript.Drive.FolderIterator = wsFolder.getFolders();
    if (childFolders.hasNext()) {
        while (childFolders.hasNext()) {
            const folder = childFolders.next();
            folder.setTrashed(true);
        }
    }
}

function setDeleteFolders(): void {
    ScriptApp.newTrigger("deleteFolders")
        .timeBased()
        .onWeekDay(ScriptApp.WeekDay.MONDAY)
        .atHour(9)
        .create();
}

function test(): void {
    const obj: object = {
        "title": [
            "ブースターパック ロストディケイド", 
            "ブースターパック Key 20th Anniversary", 
            "トライアルデッキ＋(プラス) ロストディケイド", 
            "トライアルデッキ＋(プラス)　アサルトリリィ BOUQUET", 
            "ブースターパック 新サクラ大戦"
        ],
        "image": [
            "/wordpress/wp-content/uploads/today_card/20200507_rb01.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb02.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb03.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb04.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb05.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb06.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb07.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb08.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb09.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb10.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb11.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb12.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb13.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb14.png",
            "/wordpress/wp-content/uploads/today_card/20200507_rb15.png"
        ]
    };
    const json = JSON.stringify(obj);
    postTodayCards(json);
}

class DateUtil {
    public static IsHoliday(today: Date): boolean {
        const day: number = today.getDay();
        if (day === 0 || day === 6) {
            return true;
        }
        const calendarId: string = "ja.japanese#holiday@group.v.calendar.google.com";
        const calendar: GoogleAppsScript.Calendar.Calendar = CalendarApp.getCalendarById(calendarId);
        const events: GoogleAppsScript.Calendar.CalendarEvent[] = calendar.getEventsForDay(today);
        if (events.length > 0) {
            return true;
        }
        return false;
    }
}
