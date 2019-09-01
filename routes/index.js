/**
 * Created by Navit
 */
"use strict";

var DemoBaseRoute = require("./demoRoute/demoBaseRoute");
var UserBaseRoute = require("./userRoute/userBaseRoute");
var AdminBaseRoute = require("./adminRoute/adminBaseRoute");
var TopUpBaseRoute = require("./topUpRoute/topUpBaseRoute");
var shoutBaseRoute = require('./shoutRoute/shoutBaseRoute')
var APIs = [].concat(DemoBaseRoute, UserBaseRoute, AdminBaseRoute,TopUpBaseRoute,shoutBaseRoute);
module.exports = APIs;
