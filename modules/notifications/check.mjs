import assert from 'node:assert/strict';
import {validSubscription} from './worker.js';
const sub={endpoint:'https://fcm.googleapis.com/fcm/send/demo',keys:{p256dh:'a'.repeat(87),auth:'b'.repeat(22)}};
assert(validSubscription(sub));
for(const endpoint of ['https://fcmXgoogleapisXcom/test','https://web.push.apple.com.evil.example','http://localhost'])assert(!validSubscription({...sub,endpoint}));
