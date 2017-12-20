'use strict'

var express  = require('express');
var app      = express();
var port     = process.env.PORT || 3000;

// Pull information from HTML POST (express4)
var bodyParser     = require('body-parser');

var Promise = require('bluebird');
var request = require('request-promise');
var moment = require('moment');
var createTemplate = require("passbook");

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({'extended':'true'}));

// Parse application/json
app.use(bodyParser.json());

// Parse application/vnd.api+json as json
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

// Routes
app.get('/', function (req, res) {
  res.send('Welcome to the Index Route');
});

app.get('/api/passbook', generatePassbook);

// Listen (start app with node index.js)
app.listen(port);

function generatePassbook(req, res){
  var memberNumber = req.query.memberNumber;
  return Promise
    .try(function(){
      return getMemberInfo(memberNumber);
    })
    .then(createPassBook)
    .then(function(pass){
      pass.render(res, function(err){
        if(err)
          Promise.reject(err);
      });
    })
    .catch(function(err){
      Promise.reject(err);
    })
}

function getMemberInfo(memberNumber){
  console.log('Member Number: ' + memberNumber);
  return Promise
    .try(function(){
      var options = {
        url: "https://api-hml.smiles.com.br/api/oauth/token",
        type: "POST",
        headers: {
          "User-Agent": "Smiles/1.1.0/2.0 (iPhone8,1; iOS 9.3.2; Scale/2.00)",
          "Cookie": "",
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
          "Channel": "APP",
        },
        contentType: "application/x-www-form-urlencoded",
        data: {
          "client_id": "f3025f39-b4b5-4942-b5ee-28615809988a",
          "client_secret": "87d467d3-250f-4f4b-982b-b3890d3b47ed",
          "grant_type": "client_credentials",
        },
        json: true
      };
      return request(options);
    })
    .then(function(tokenData){
      console.log('Token Data: ' + tokenData);
      var access_token = tokenData.access_token;
      var options = {
        url: "https://api-hml.smiles.com.br/smiles/login",
        type: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer " + access_token,
          "Content-Type": "application/json",
        },
        contentType: "application/json",
        data: {
          "id": memberNumber,
          "password": "1010"
        },
        json: true
      }
      return request(options);
    })
    .then(function(loginData){
      console.log('Login Data: ' + loginData);
      var token = loginData.token;
      var options = {
        url: "https://api-hml.smiles.com.br/smiles-bus/MemberRESTV1/GetMember",
        type: "POST",
        headers: {
          "Channel": "APP",
          "Content-Type": "application/json",
        },
        contentType: "application/json",
        data: {
          "memberNumber": memberNumber,
          "token": token
        },
        json: true
      }
      return request(options);
    })
    .catch(function(err){
      Promise.reject(err);
    });
}

function createPassBook(member){
  console.log('Member: ' + member);
  return Promise
    .try(function(){
      var category = member.category;
      var firstName = member.firstName;
      var lastName = member.lastName;
      var memberNumber = member.memberNumber;
      var memberSince = moment(member.memberSince).format('DD/MM/YYYY');
      var milesNextExpirationDate = moment(member.milesNextExpirationDate).format('DD/MM/YYYY');
      // var category = 'DIAMANTE';
      // var firstName = 'Arthur';
      // var lastName = 'Vargas';
      // var memberNumber = '123123213';
      // var memberSince = '23/09/2017';
      // var milesNextExpirationDate = '24/09/2018';

      var template = createTemplate("eventTicket", {
          teamIdentifier:     "58F2M46G6R",
          passTypeIdentifier: "pass.ws.rethink.dev.passbook",
          organizationName:   "Smiles S.A.",
      });

      template.keys("keys", "rethink");

      var pass = template.createPass({
          description: 'Cartão de Fidelidade Smiles',
          serialNumber: '1',
          voided: false,
          suppressStripShine: true,
          location: {
            relevantText: "location screen"
          },
          eventTicket: {
            backFields: [
              {
                key: "cda",
                label: "Central de Atendimento",
                value: "0300 115 7001",
                textAlignment: "PKTextAlignmentNatural"
              },
              {
                key: "tou",
                label: "Termos de Uso",
                value: "Este cartão smiles é pessoal e intransferível e está sujeito às condições do regulamento do programa",
              }
            ],
            secondaryFields: [
              {
                key: "clientName",
                label: "Nome",
                value: firstName + ' ' + lastName,
                textAlignment: "PKTextAlignmentNatural"
              },
              {
                key: "startDate",
                label: "Membro Desde",
                value: memberSince,
                textAlignment: "PKTextAlignmentNatural"
              }
            ],
            auxiliaryFields: [
              {
                key: "memberNum",
                label: "Número Smiles",
                value: memberNumber,
                textAlignment: "PKTextAlignmentNatural"
              },
              {
                key: "memberCategory",
                label: "válidade da Categoria",
                value: milesNextExpirationDate,
                textAlignment: "PKTextAlignmentRight"
              }
            ]
          },
          barcode: {
            altText: "membernumber",
            format: "PKBarcodeFormatQR",
            message: memberNumber,
            messageEncoding: "UTF-8"
          }
        });

      if(category == "PRATA"){
          pass.fields.labelColor = "rgb(244,121,44)";
          pass.fields.foregroundColor = "rgb(255,255,255)";
          pass.fields.backgroundColor =  "rgb(210,220,221)";
          pass.strip("./resources/strip_silver.png");
      }

      else if(category == "OURO"){
          pass.fields.labelColor = "rgb(255,255,255)";
          pass.fields.foregroundColor = "rgb(255,255,255)";
          pass.fields.backgroundColor =  "rgb(222,168,100)";
          pass.strip("./resources/strip_gold.png");
      }

      else if(category == "DIAMANTE"){
          pass.fields.labelColor = "rgb(244,121,44)";
          pass.fields.foregroundColor = "rgb(255,255,255)";
          pass.fields.backgroundColor =  "rgb(30,30,30)";
          pass.strip("./resources/strip_diamond.png");
      }

      else{
          pass.fields.labelColor = "rgb(0,43,50)";
          pass.fields.foregroundColor = "rgb(255,255,255)";
          pass.fields.backgroundColor =  "rgb(244,121,44)";
          pass.strip("./resources/strip_orange.png");
      }

      pass.icon("icon.png");
      pass.icon2x("icon@2x.png");
      pass.loadImagesFrom("resources");

      return pass;
    })
    .catch(function(err){
      Promise.reject(err);
    });
}
