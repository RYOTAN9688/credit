//クレジットカード情報を安全に収集してstripeに登録する


//stripeでは公開鍵と秘密鍵による暗号化を行うことで情報を保護している
//Stripeクラスのコンストラクタには公開鍵を含めている
let stripe = Stripe("pk_test_xxx");
//elementクラスのインスタンスを返す
let elements = stripe.elements();

//注文情報。サーバーはこのjsonを受けとって処理を行う。
let order = {
    items: [
        {
            name: "scrab",
            amount: 2000,
            quantity: 2
        },
        {
            name: "soap",
            amount: 1500,
            quantity: 1
        }
    ],
    currency: "jpy",
    paymentMethhodId: null
}
//カード番号入力のスタイルを決める
let style = {
    base: {
        color: "32325d"
    }
};
//カードのスタイルをstripeに追加する
const card = elements.create("card", { style: style });
//stripe情報をcard-elementに上げる
card.mount("#card-element")
//入力されたクレジットカード情報をチェック
card.on("change", ({ error }) => {
    const displayError = document.getElementById("card=errors");
    //エラーの存在を判定する
    if (error) {
        //カード番号が無効と表示する
        displayError.textContent = error.message;
    } else {
        displayError.textContent = "";
    }
});

//注文確定ボタンのDOMを取得
const submitButton = document.getElementById("payment-form-submit");

//ボタンがクリックされるとアクションを実行

submitButton.addEventListener("click", (event) => {
    //スピナーを表示する
    displaySpinner();

    stripe
        //収集支払い情報に変換する
        .createPaymentMethod("card", card)
        .then((result) => {
            //エラー時の処理
            if (result.error) {
                onError();

                //成功したときにサーバーサイドに注文情報を送信
            } else {
                //支払いメソッドIDをリクエストデータに入れる
                order.paymentMethhodId = result.paymentMethhodId.id;

                //サーバーサイドへ決済情報を渡して結果をハンドリングする
                //サーバは http://localhost:3000/v1/order/payment にPOSTでリクエストを受け付けている
                fetch("http://localhost:3000/v1/order/payment",
                    {
                        method: "POST",//データを送信したいのでPOST
                        headers: { "Content-Type": "application/json" },//application/jsonを指定
                        body: JSON.stringify(order)//orderオブジェクトを文字列化して設定
                    })
                    .then((result) => {
                        //HTTPレスポンスからボディのJSONを取り出して次のメソッドに引き渡す
                        return result.json();
                    })
                    .then((response) => {
                        onComplete(response);
                        //正常終了
                    })
            }

        })
        .catch(() => {
            //エラー発生時
            onError();
        });
});

const returnButtonNormal = document.getElementById("return-button-normal");
const returnButtonError = document.getElementById("return-button-error");
const returnButtonNotYet = document.getElementById("return-button-not-yet");
const returnButtonDefault = document.getElementById("return-button-default");


returnButtonNormal.addEventListener("click", reset);
returnButtonError.addEventListener("click", reset);
returnButtonNotYet.addEventListener("click", reset);
returnButtonDefault.addEventListener("click", reset);

function reset(event) {
    hideError();
    hideMessage();
    hideNotYetMessage();
    displayButton();


    card.mount("#card-element");

}

//決済処理が正常に終了したときに実行する
const onComplete = (response) => {
    shutdown();
    //スピナー終了
    hideSpinner();
    if (response.error) {
        onError()
        //エラーがなければ成功メッセージを表示する
    } else if (response.paymentIntentStatus === "succeeded") {
        //確定ボタンを押して完了メッセージを表示する
        displayMessage();
    } else {
        //サーバサイドの決済処理にて成功を受けとることができなかったら
        //やり直しメッセージを表示する
        displayNotYetMessage();
    }

}

const onError = () => {
    shutdown();
    if (!document.querySelector(".spinner-border").classList.contains("collapse")) {
        hideSpinner();
    }
    //エラーメッセージを表示する
    displayError();
}

const shutdown = () => {
    //stripeのinputタグへの非表示、
    card.unmount();
    //注文確定ボタンの非表示を行う
    hideButton();
}

//クラスリストにcollapgeを追加すれば非表示、削除すれば表示にする

const hideSpinner = () => {
    //div classのspinner-borderを選択し、collapseをclassに追加
    document.querySelector(".spinner-border").classList.add("collapse");
};

const displaySpinner = () => {
    //div classのspinner-borderを選択し、collapseをclassから削除
    document.querySelector(".spinner-border").classList.remove("collapse");
}

//エラーメッセージ
const hideError = () => {
    document.querySelector(".contents-payment-error").classList.add("collapse");
}

const displayError = () => {
    document.querySelector(".contents-payment-error").classList.remove("collapse");
}

//成功メッセージ
const hideMessage = () => {
    document.querySelector(".contents-payment-result").classList.add("collapse");
}

const displayMessage = () => {
    document.querySelector(".contents-payment-result").classList.remove("collapse");
}
//失敗メッセージ
const hideNotYetMessage = () => {
    document.querySelector(".contents-payment-not-yet").classList.add("collapse");
}

const displayNotYetMessage = () => {
    document.querySelector(".contents-payment-not-yet").classList.remove("collapse");
}

//注文確定ボタン
const hideButton = () => {
    document.querySelector("#payment-form-submit").classList.add("collapse");
}
const displayButton = () => {
    document.querySelector("#payment-form-submit").classList.remove("collapse");
}