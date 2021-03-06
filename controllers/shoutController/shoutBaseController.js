var Service = require("../../services");
var UniversalFunctions = require("../../utils/universalFunctions");
var async = require("async");
var TokenManager = require("../../lib/tokenManager");
var CodeGenerator = require("../../lib/codeGenerator");
var ERROR = UniversalFunctions.CONFIG.APP_CONSTANTS.STATUS_MSG.ERROR;
var _ = require("underscore");
var Config = require("../../config");
var NodeMailer = require("../../lib/nodeMailer");



var createShout = function (userData, payloadData, callback) {
  var adminSummary = null;
  var numberOfPeople = 0;
  var shouting = 0;
  var DATA = {};
  var dataToSend = [];
  var dataNotSent = [];
  var dataToUpdate = null;
  var amount = null;
  async.series([
    function (cb) {
      var criteria = {
        _id: userData._id
      };
      Service.AdminService.getAdmin(criteria, {
        password: 0
      }, {}, function (err, data) {
        if (err) cb(err);
        else {
          if (data.length == 0) cb(ERROR.INCORRECT_ACCESSTOKEN);
          else {
            userFound = (data && data[0]) || null;
            cb();
          }
        }
      });
    },
    function (cb) {
      Service.AdminService.getAdminExtended({
        adminId: userData._id
      }, {
        password: 0,
        __v: 0,
        createdAt: 0
      }, {}, function (err, data) {
        if (err) cb(err)
        else {
          adminSummary = data && data[0] || null;
          amount = adminSummary.balance;
          cb()
        }
      })
    },


    function (cb) {
      projection = {
        firstLogin: 0,
        emailVerified: 0,
        isBlocked: 0,
        firstName: 0,
        lastName: 0,
        countryCode: 0,
        password: 0,
        registrationDate: 0,
        codeUpdatedAt: 0,
        __v: 0,
        accessToken: 0,
      }

      if (payloadData.userId) {
        var taskInParallel = [];
        for (var key in payloadData.userId) {
          (function (key) {
            taskInParallel.push((function (key) {
              return function (embeddedCB) {
                //TODO
                Service.UserService.getUser({
                  _id: payloadData.userId[key]
                }, {}, {
                  lean: true
                }, function (err, data) {
                  if (err) {
                    embeddedCB(err)
                  } else {

                    if (payloadData.credits > 0 && amount >= payloadData.credits) {
                      amount -= payloadData.credits;
                      DATA.adminName = userFound.fullName;
                      DATA.receiverId = data[0]._id;
                      DATA.receiversName = data[0].firstName;
                      DATA.receiversEmail = data[0].emailId;
                      DATA.credits = payloadData.credits;
                      DATA.message = payloadData.message;
                      console.log(DATA);
                      dataToSend.push(DATA);
                      DATA = {};
                      numberOfPeople += 1;
                    }
                    else{
                      DATA.receiverId = data[0]._id;
                      DATA.receiversName = data[0].firstName;
                      DATA.receiversEmail = data[0].emailId;
                      DATA.credits = payloadData.credits;
                      DATA.message = payloadData.message;
                      dataNotSent.push(DATA);
                      DATA = {};
                    }
                    embeddedCB()
                  }
                })
              }
            })(key))
          }(key));
        }
        async.parallel(taskInParallel, function (err, result) {
          cb(null);
        });
      } else {
        cb();
      }
    },



    function (cb) {
      console.log(payloadData, amount)

      shouting = payloadData.credits * numberOfPeople;
      totalshouting = adminSummary.shouting + shouting;
      recognition = adminSummary.recognition + numberOfPeople;
      dataToUpdate = {
        $set: {
          balance: amount,
          shouting: totalshouting,
          recognition: recognition
        }
      };
      Service.AdminService.updateAdminExtended({
        adminId: userData._id
      }, dataToUpdate, {}, function (err, data) {
        if (err) cb(err);
        else {

          if (dataToSend) {
            var taskInParallel = [];
            for (var key in dataToSend) {
              (function (key) {
                taskInParallel.push((function (key) {
                  return function (embeddedCB) {
                    dataToCreate = {
                      adminId: adminSummary._id,
                      receiverId: dataToSend[key].receiverId,
                      emailId: dataToSend[key].receiversEmail,
                      credits: dataToSend[key].credits,
                      message: dataToSend[key].message
                    }
                    //TODO
                    Service.ShoutTransaction.createShoutTransaction(dataToCreate, function (err, transData) {
                      if (err) {
                        embeddedCB(err)
                      } else {
                        console.log("!!!!!!!!!!!!!!!!!!!!!!", dataToSend[key])
                        dataToSend[key].redeemLink = "Somelink/" + transData._id;
                        console.log(dataToSend[key].redeemLink)
                        console.log("data : ", dataToSend[key])
                        NodeMailer.sendMail(dataToSend[key]);
                        embeddedCB()
                      }
                    })
                  }
                })(key))
              }(key));
            }
            async.parallel(taskInParallel, function (err, result) {
              cb(null);
            });
          }

        }
      })
    },
  ], function (err, result) {
    if (err) callback(err)
    else callback(null, {
      numberOfPeople,
      shouting,
      dataToSend,
      dataNotSent
    })
  })
}


var getShoutTransaction = function (payloadData, callback) {
  var transData = []
  async.series([

    function (cb) {
      var criteria = {
        _id: payloadData.transactionId,
        redeemed : false
      };
      Service.ShoutTransaction.getShoutTransaction(criteria, {
        __v: 0
      }, {}, function (err, data) {
        if (err) cb(err)
        else {
          if(data.length == 0){
            cb(ERROR.INVALID_COUPON)
          }
          else{
            transData = data;
            cb()
          }
          
        }
      })
    }

  ], function (err, result) {
    if (err) callback(err)
    else callback(null, {
      data: transData
    })
  })
}



var redeemTransaction = function (payloadData, callback) {
  var transData = []
  var adminSummary = null;
  async.series([
    function (cb) {
      var criteria = {
        _id: payloadData.transactionId,
        redeemed : false
      };
      Service.ShoutTransaction.getShoutTransaction(criteria, {
        __v: 0
      }, {}, function (err, data) {
        if (err) cb(err)
        else {
          if(data.length == 0)
          {
            cb(ERROR.INVALID_COUPON)
          }
          else{
            transData = data && data[0] || null;
            cb()
          }
        }
      })
    },

    function(cb){
      if(payloadData.amount == transData.credits){
        Service.ShoutTransaction.updateShoutTransaction({_id : payloadData.transactionId}, {redeemed : true},{}, function (err , data){
          if(err) cb(err)
          else{
            cb()
          }
        })
      }
      else if(payloadData.amount < transData.credits){

        var dataToPass = {
          transactionId : payloadData.transactionId,
          adminId : transData.adminId,
          credits : transData.credits,
          amountSpent : payloadData.amount
        }

        concludeTransaction(dataToPass,function(err,data){
          cb()
        })
      }
      else{
        cb(ERROR.INVALID_AMOUNT)
      }
    }
  ], function (err, result) {
    if (err) callback(err)
    else callback(null, {
      data: transData
    })
  })
}

var concludeTransaction = function(DATA ,callback){
  var adminSummary = null;

  async.series([
    function (cb) {
      Service.AdminService.getAdminExtended({_id : DATA.adminId}, {} , {} , function(err , data){
        if(err) cb(err)
        else{
          adminSummary = data && data[0] || null;
          cb()
        }
      })
    },

    function(cb){
      Service.ShoutTransaction.updateShoutTransaction({_id : DATA.transactionId} , {$set : {redeemed : true}} , {} , function(err, data){
        if(err) cb(err)
        else{
            cb()
        }
      })
    },

    function(cb)
    {
      var amount = adminSummary.balance + DATA.credits - DATA.amountSpent;
      Service.AdminService.updateAdminExtended({_id : DATA.adminId} , {$set : { balance : amount }} , {} , function(err , data){
        if(err) cb(err)
        else{
          adminSummary = data;
          cb()
        }
      })
    }

  ], function (err, result) {
    if (err) callback(err)
    else callback(null)
  })
}


module.exports = {
  createShout: createShout,
  getShoutTransaction: getShoutTransaction,
  redeemTransaction : redeemTransaction
}
