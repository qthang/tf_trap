/*
脚本作者：DecoAri
修复作者: xream
引用地址：https://raw.githubusercontent.com/DecoAri/JavaScript/main/Surge/Auto_join_TF.js
感谢某位大佬将改写为Loon版脚本！
*/
!(async () => {
  ids = $persistentStore.read("APP_ID");
  if (ids == null) {
    $notification.post(
      "未添加 TestFlight APP_ID",
      "请手动添加或使用 TestFlight 链接自动获取",
      ""
    );
  } else if (ids == "") {
    $notification.post("所有 TestFlight 已加入完毕", "请手动禁用该插件", "");
  } else {
    ids = ids.split(",");
    for await (const ID of ids) {
      await autoPost(ID);
    }
  }
  $done();
})();

function sendMessageToTelegram(message) {
  return new Promise((resolve, reject) => {
    const chat_id = "608667192";
    const telegrambot_token = "6675183376:AAFIHE7oDIHTb1vtOsZMLunu9oEcD0DwPTM";
    const url = `https://api.telegram.org/bot${telegrambot_token}/sendMessage`;
    const body = {
      chat_id: chat_id,
      text: message,
      entities: [{ type: "pre", offset: 0, length: message.length }],
    };
    const options = {
      url: url,
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    };

    $httpClient
      .post(options)
      .then((response) => {
        if (response.statusCode == 200) {
          resolve(response);
        } else {
          reject(
            new Error(
              `Telegram API request failed with status code ${response.statusCode}`
            )
          );
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function autoPost(ID) {
  let Key = $persistentStore.read("key");
  let testurl = "https://testflight.apple.com/v3/accounts/" + Key + "/ru/";
  let header = {
    "X-Session-Id": `${$persistentStore.read("session_id")}`,
    "X-Session-Digest": `${$persistentStore.read("session_digest")}`,
    "X-Request-Id": `${$persistentStore.read("request_id")}`,
    "User-Agent": `${$persistentStore.read("tf_ua")}`,
  };
  return new Promise(function (resolve) {
    $httpClient.get(
      { url: testurl + ID, headers: header },
      function (error, resp, data) {
        if (error == null) {
          if (resp.status == 404) {
            ids = $persistentStore.read("APP_ID").split(",");
            ids = ids.filter((ids) => ids !== ID);
            $persistentStore.write(ids.toString(), "APP_ID");
            console.log(ID + " " + "不存在该 TestFlight，已自动删除该 APP_ID");
            $notification.post(
              ID,
              "不存在该 TestFlight",
              "已自动删除该 APP_ID"
            );
            resolve();
          } else {
            let jsonData = JSON.parse(data);
            if (jsonData.data == null) {
              console.log(ID + " " + jsonData.messages[0].message);
              resolve();
            } else if (jsonData.data.status == "FULL") {
              console.log(
                jsonData.data.app.name + " " + ID + " " + jsonData.data.message
              );
              resolve();
            } else {
              $httpClient.post(
                { url: testurl + ID + "/accept", headers: header },
                function (error, resp, body) {
                  let jsonBody = JSON.parse(body);
                  $notification.post(
                    jsonBody.data.name,
                    "TestFlight 加入成功",
                    ""
                  );
                  console.log(jsonBody.data.name + " TestFlight 加入成功");
                  ids = $persistentStore.read("APP_ID").split(",");
                  ids = ids.filter((ids) => ids !== ID);
                  $persistentStore.write(ids.toString(), "APP_ID");
                  sendMessageToTelegram(
                    `${jsonBody.data.name} joined successfully`
                  );
                  resolve();
                }
              );
            }
          }
        } else {
          if (error == "The request timed out.") {
            resolve();
          } else {
            $notification.post("自动加入 TestFlight", error, "");
            console.log(ID + " " + error);
            resolve();
          }
        }
      }
    );
  });
}
