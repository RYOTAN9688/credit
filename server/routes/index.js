var express = require('express');
var router = express.Router();
const env = require("dotenv").config({ path: "./.env" });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const logger = require("../logger");


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post("/v1/order/payment", async function (req, res, next) {

  logger.info("ルータメソッドの処理を開始します.　リクエスト : ", req.body);
  const { paymentMethodId, paymentIntentId, items, currency, useStripeSdk } = req.body;

  const total = calculateAmount(req.body.items)
  try {
    let intent;
    //クライアントからpaymentMethodIdを指定してリクエストが来た場合の処理
    if (paymentMethodId) {
      const request = {
        amount: total,//金額
        currency: currency,//通貨
        payment_method: paymentMethodId,//支払い手段id
        confirmation_method: "manual",
        confirm: true,//確認
        use_stripe_sdk: useStripeSdk
      }
      logger.info("Stripe APIを呼び出します.　リクエスト :", request);
      //requestの初期化
      //クライアントから受けとったリクエストデータがstripeに登録されると
      //PaymentIntentのインスタンスが返ってくる。
      //つまりintentはPaymentintentのインスタンスとなる
      intent = await stripe.paymentIntents.create(request);
      logger.info("Stripe APIを呼び出しました.　レスポンス :", intent);
    } else if (paymentIntentId) {
      intent = await stripe.paymentIntents.confirm(paymentIntentId)
    }
    const response = generateResponse(intent);
    logger.info("ルータメソッドの処理を終了します. レスポンス :", response)
    res.send(response);
  } catch (e) {
    //エラーが発生したことをログに出力する。logレベルはerror
    logger.error("ルータメソッドの処理中にエラーが発生しました。 :", e);
    //エラーレスポンスの生成、返却
    const response = generateErrorResponse(e.message);
    res.status(500);
    res.send(response);
  }
});

//商品代金を計算する処理
//商品リストを引数に請求金額合計を返してくれる関数を新しく定義
//ミドルウェア関数から呼び出す

const calculateAmount = (items) => {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    const current = items[i].amount * items[i].quantity;
    total += current;
  }
  return total;
}

const generateResponse = (paymentIntent) => {
  let response = {
    requireAction: true,//アクション要求有無
    clientSecret: "",//クライアント固有値
    paymentIntentStatus: ""//支払い意思ステータス
  }
  switch (paymentIntent.status) {
    //3Dセキュア（不正使用から保護を強化するための認証手順)、での認証など、
    //支払いに追加アクションが必要な場合、paymentIntentはrequires_actionになる
    case "requires_action":
      response.paymentIntentStatus = "requires_action";
      break;
    //
    case "requires_source_action":
      response.paymentIntentStatus = "requires_source_action";
      response.requiresAction = true;
      respomse.clientSecret = paymentIntent.client_secret;
      break;
    //支払い処理に失敗した場合、
    case "requires_payment_method":
      response.paymentIntentStatus = "requires_payment_method";
      break;
    case "requires_source":
      response.paymentIntentStatus = "requires_source";
      response.error = {
        messages: ["カードが拒否されました。別の決済手段をお試しください"]
      }
      break;
    case "succeeded":
      response.paymentIntentStatus = "succeeded";
      response.clientSecret = paymentIntent.client_secret;
      break;
    default:
      response.error = {
        messages: ["システムエラーが発生しました"]
      }
      break;
  }
  return response;
}

//引数にとる文字列（を想定した）errorを配列であるmessagesに入れ、エラーオブジェクトを返す
const generateErrorResponse = (error) => {
  return {
    error: {
      messages: [error]
    }
  }
}
module.exports = router;
