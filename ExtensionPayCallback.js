
/*
import {ExtPay} from './ExtPay.js'

const extpay = ExtPay('ceres-cart');
extpay.onPaid.addListener(user => {
    console.log('user paid!', user)
})*/ 
chrome.runtime.sendMessage({ to: 'extensionPayClosed'}); 
console.log('ext pay callback ');