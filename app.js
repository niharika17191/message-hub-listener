/*globals invoke_trigger */
/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js Bluemix starter code
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var request = require('request');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();


// start server on the specified port and binding host
/*app.listen(appEnv.port, '0.0.0.0', function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
*/
//------------------------------------------------------------------------------
// GC-Events specific code
//------------------------------------------------------------------------------

//initialize Message Hub Rest Client
var bodyParser = require('body-parser');
var MessageHub = require('message-hub-rest');
var instance = new MessageHub(appEnv.services);
var Cloudant = require('cloudant');
var cradle = require('cradle');
//var cloudant = Cloudant("https://70754d3e-bb88-4c0b-94e9-22edc0ac44c2-bluemix:b9cb70f0afe761f794185455737b1f304a3ba278a9349dbe9941c126375a14a4@70754d3e-bb88-4c0b-94e9-22edc0ac44c2-bluemix.cloudant.com");
var cloudantInstance = new Cloudant(appEnv.url);
if (process.env.VCAP_SERVICES) {
	  // Running on Bluemix. Parse the process.env for the port and host that we've been assigned.
	  var env = JSON.parse(process.env.VCAP_SERVICES);
	  var host = process.env.VCAP_APP_HOST; 
	  var port = process.env.VCAP_APP_PORT;
	  console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);    
	  // Also parse out Cloudant settings.
	 // var cloudantObj = process.env.VCAP_SERVICES.cloudantNoSQLDB;
	  //console.log(cloudantObj);
	  var cloudant = env['cloudantNoSQLDB'][0]['credentials'];
	  var cloudantUsername = cloudant.username;
	  var cloudantPassword = cloudant.password;
	  var cloudantPort = cloudant.port;
	  var cloudantUrl = cloudant.url;
	  var cloudantHost = cloudant.host;
	  //console.log(cloudantUsername, cloudantPassword, cloudantPort, cloudantUrl, cloudantHost);
}
app.listen(appEnv.port, '0.0.0.0', function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
  /*console.log(appEnv.services);
  console.log(appEnv.app);
  console.log(appEnv.port);
  console.log(appEnv.url);
  console.log(instance);
  console.log(cloudantInstance);
  console.log(cloudantUsername, cloudantPassword, cloudantPort, cloudantUrl, cloudantHost);*/
//  console.log(cloudantUsername);
  
//  console.log(db);
  
});

var account = new(cradle.Connection)({
            host: cloudantHost,
            port: 443,
    		secure: true,
    		auth: { 
    			username: cloudantUsername,
    			password: cloudantPassword
    		}
        });
        
//console.log(account);        
       
//create database       
var db = account.database('trigger');

db.exists(function (err, exists) {
    if (err) {
      console.log('error', err);
    } else if (exists) {
      console.log('database exists');
    } else {
      console.log('database does not exists.');
      db.create();
      /* populate design documents */
    }
});
              

//var topicName = 'gcevents';
var triggerUrls = [];
var topicNameB2I = 'Bluemix-Infosphere';
var topicNameI2B = 'Infosphere-Bluemix';
var consumerGroupName = 'my-consumers' +  appEnv.app.instance_id;
var consumerInstanceName = consumerGroupName + 'Instance';
//var instance = new MessageHub(appEnv.services);
var consumerInstance;
var initialEventData = '{"topEvents":[{"row":["loading",0]}],"eventSourceHistory":[{"row":["loading","loading","loading","loading"]},{"row":["loading",0,0,0]}],"eventTable":[{"row":["loading","loading",0]}]}';
var eventData = initialEventData;
var responseJson = null;
var requestId = 0;
var responseId = 0;
var lastEvent = "";



 
//endpoint to get data
app.get("/eventData", function(req, res){
  res.json(eventData);
});

//endpoint to get data
app.get("/lastEvent", function(req, res){
  res.send(lastEvent);
});


//endpoint to get data
app.get("/eventData2", function(req, res){
 res.send("test erfolgreich");
});

//endpoint to get data
app.get("/isResponse", function(req, res){
 res.send(responseJson);
});


//endpoint to get data
app.get("/isResponseId", function(req, res){
 res.send("" + responseId);
});

 
// make bodyParser accepts text/plain - required for request processing in /produceMessage
app.use(bodyParser.text());


app.use(bodyParser.text({type: '*/*'}));
app.use(bodyParser.urlencoded({extended: true}));

app.post("/produceMessage", function(req, res){
  console.log('produceMessage input received:');
  console.log(req.body);  
 //    var list = new MessageHub.MessageList();
  //  list.push(req.body);

    instance.produce("InfosphereEvents", req.body)
      .then(function(response) {
          console.log(response);
      })
      .fail(function(error) {
      	console.log('produce failed'); 
        throw new Error(error);
      });
      
      
   res.json('{"response":"success"}');
});

global.triggerUrls ;
global.event ;
app.post("/webhook",function(req,res){
	
    var obj= JSON.parse(req.body);
    console.log(obj);
    var obj_events = obj.events;
    var eventFilter = obj_events.toString();
	var obj_config= obj.config;
	triggerUrls=obj_config.url;
	console.log(triggerUrls);
	db.save({
		description: 'trigger',
		event: eventFilter,
		trigger: triggerUrls
	}, function(err, res){
	console.log("registered");	
	})
	res.json('{"response":"success"}');	
});


console.log("reached delete endpoint");
app.get("/deleteall",function(req,res){
    //console.log(db.list);
	db.all(function(err,body){
		if (err) 
		  return console.log('Error listing docs');
		  body.rows.forEach(function(doc) {
		  console.log("inside delete endpoint");
			  if ( doc.id.substring(0,7) != '_design') {
				  console.log('deleting id: %s, rev: %s', doc.id, doc.value.rev);
				  var id = doc.id;
				  var rev = doc.value.rev;
				  var deleteUrl = cloudantUrl+'/trigger/'+id+'?rev='+rev ;
				  console.log(deleteUrl);
				request({
        				method: 'DELETE', 
       					uri: deleteUrl, 
  							}, function (req,res) {
        						console.log("deleting");
                				  })
               	
 							 }
				  
				  	})
				  
		})
	res.json('{"response":"success"}');	
	});
	
	
app.post("/deletetrigger",function(req,res){
	
	console.log(req.body);
	var obj_delete= JSON.parse(req.body);
    console.log(obj_delete);
	var obj_config_delete= obj_delete.config;
	var triggerUrls_delete=obj_config_delete.url;
	console.log(triggerUrls_delete);
	
	var index1 = {
  						"index": {"fields": ["triggerUrls_delete"]}
						};
          
        
        request({
       			 method: 'POST', 
        		 uri: cloudantUrl+'/trigger/_index', 
        		 json: true, 
                 body: index1
  			}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log("Success Index");
          console.log(response.statusCode,body)
                  }
  });
        
       //query database   
       var querydb1 ={"selector": {
       						"_id":{"$gt":0},       					   
    						"trigger": { "$eq": triggerUrls_delete}
    						},
  						"fields": [
   								 "_id",
    							 "_rev",
    							 "event",
    							 "trigger"  ]};
    	console.log("reached query!!");	
    	console.log(querydb1);
    	 request({
        		method: 'POST', 
       		    uri: cloudantUrl+'/trigger/_find', 
                json: true, 
                body: querydb1}, function (error, response, body) {
        if(error){
           	console.log(error);
         } 	
         
        if (!error && response.statusCode == 200) {
          console.log("reached query");
          console.log(body);
          //var body1=JSON.parse(body);
          var body1= body.docs;
          console.log(body1);
          var body2= body1[0];
          console.log(body2);
          var id = body2._id;
          console.log(id);
          var rev =body2._rev;
          var url =cloudantUrl+'/trigger/'+id+'?rev='+rev;
          console.log(url);    
       
         request({
         	method:'DELETE',
         	uri:url
         },function(res,req){
         	
         	console.log("deleted successfully");
         })
 
        console.log(response.statusCode);       
        }
	});
	
	res.json('{"response":"success"}');
	
});
	
	
	
/*app.get("/isRequest", function(req, res){
  
//var request = '{"Id":"12345","Url":"https://durlesbach.boeblingen.de.ibm.com:9443/ibm/iis/dqec/rest/descriptors","Method":"GET","Header" : { "Accept" : "application/json","Authorization" : "Basic aXNhZG1pbjppbmZvc3BoZXJl"}}';
//var request = '{"Id":"12345","Url":"https://durlesbach.boeblingen.de.ibm.com:9443/ibm/iis/igc-rest/v1/assets/6662c0f2.e1b13efc.8gi57ujdm.rv8gj9e.c2rf90.f5nfeig2011q5hhrc4smu","Method":"GET","Header" : { "Accept" : "application/json","Authorization" : "Basic aXNhZG1pbjppbmZvc3BoZXJl"}}';
console.log('rid' + req.query.rid);

	requestId++;
  
var request = '{"Id":"' + requestId + '","Url":"https://durlesbach.boeblingen.de.ibm.com:9443/ibm/iis/igc-rest/v1/assets/' + req.query.rid + '","Method":"GET","Header" : { "Accept" : "application/json","Authorization" : "Basic aXNhZG1pbjppbmZvc3BoZXJl"}}';

console.log('produce IS Request:');
  console.log(request); 
     var list = new MessageHub.MessageList();
    list.push(request);

    instance.produce(topicNameB2I, request)
      .then(function(response) {
          console.log(response);
      })
      .fail(function(error) {
      	console.log('produce failed'); 
        throw new Error(error);
      });
      
      
   res.send("" + requestId);
});*/


// create topic
/*
  instance.topics.create(topicNam)
    .then(function(response) {
      console.log(topicName + ' topic created.');
      // Set up a consumer group of the provided name.
      return instance.consume(consumerGroupName, consumerInstanceName, { 'auto.offset.reset': 'largest' });
    })
    .then(function(response) {
      consumerInstance = response[0];
      console.log('Consumer Instance created.');
      // Set offset for current consumer instance.
      return consumerInstance.get(topicName);
    })
    .fail(function(error) {
    console.log(error);
    });
*/
/*
      // Set up a consumer group of the provided name.
  instance.consume(consumerGroupName, consumerInstanceName, { 'auto.offset.reset': 'largest' })
    .then(function(response) {
      consumerInstance = response[0];
      console.log('Consumer Instance created.');
      // Set offset for current consumer instance.
      return consumerInstance.get(topicNameI2B);
    })
    .fail(function(error) {
    console.log(error);
    });

// Set up an interval which will poll Message Hub for new messages on the topic.
 
  var produceInterval = setInterval(function() {

    // Attempt to consume messages
    if(consumerInstance) {
      consumerInstance.get(topicNameI2B)
        .then(function(data) {
          console.log('Recieved data length: ' + data.length);        	 
          if(data.length > 0) {
            console.log('Recieved data: ' + data);
            eventData = data;
            responseJson = JSON.parse(data);
            responseId =  responseJson.Id;
            console.log("response data id: " + responseId);
          }
        })
        .fail(function(error) {
          throw new Error(error);
        });
    }
  }, 2000);
*/

// -----------InfosphereEvents------------------------ Set up an interval which will poll Message Hub for new messages on the topic.
      // Set up a consumer group of the provided name.
     
     var consumerInstancEvents
  instance.consume(consumerGroupName+"e", consumerInstanceName+"e", { 'auto.offset.reset': 'largest' })
    .then(function(response) {
      consumerInstancEvents = response[0];
      console.log('Events Consumer Instance created.');
      // Set offset for current consumer instance.
      return consumerInstancEvents.get("InfosphereEvents");
    })
    .fail(function(error) {
    console.log(error);
    });
  
  var produceIntervalEvents = setInterval(function() {
	
    // Attempt to consume events  
    if(consumerInstancEvents) {
      consumerInstancEvents.get("InfosphereEvents")
        .then(function(data) {
        	console.log("here"); 				       
          console.log('InfosphereEvents Recieved data length: ' + data.length); 
          //console.log(data);
          
         var data_json = data.toString();
         var dataToString = JSON.parse(data_json);
         var eventData = dataToString.event;
          
         //create index in database 
         var index = {
  						"index": {"fields": ["event"]}
						};
          
        
        request({
        method: 'POST', 
        uri: cloudantUrl+'/trigger/_index', 
        json: true, 
        body: index
  			}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log("Success");
                  }
  });
        
       //query database   
       var querydb ={"selector": {
    						"event": { "$eq": eventData}
    						},
  						"fields": [
   								 "_id",
    							 "_rev",
    							 "event",
    							 "trigger"  ]};
    							 
  	    
  	    
  	    request({
        method: 'POST', 
        uri: cloudantUrl+'/trigger/_find', 
        json: true, 
        body: querydb}, function (error, response, body) {
        if(error){
           	console.log(error);
         } 	
         
        if (!error && response.statusCode == 200) {
          console.log("reached query");
          console.log(body);       
          var x = body.docs;
          var t = x[0];
          var invoke_trigger = t.trigger;
          console.log(invoke_trigger);          
       }
        
        //invoke trigger URL
        request({
        	method: 'POST',
        	uri:invoke_trigger,
        	body:dataToString,
        	json:true
        	}, function(res,req){
        	console.log("success")
        	})
 		 });
  })
        .fail(function(error) {
          throw new Error(error);
        });
    }
  }, 20000);
//-------------------------------------------------------


//debug endpoint to produce sample event data
/*
-app.get("/sampleEventData", function(req, res){
//var sampleEventData = '{"topEvents":[{"row":["Event1",13]},{"row":["Event2",23]},{"row":["Event3",33]}],"eventSourceHistory":[{"row":["Time","MDM Server","Information Analyzer","Exception Stage"]},{"row":["02:00",1000,400,1000]},{"row":["02:10",1170,460,800]},{"row":["02:20",660,1120,400]}],"eventTable":[{"row":["EventA","Source1",34]},{"row":["EventB","Source2",54]},{"row":["EventC","Source2",2]},{"row":["EventD","Source3",12]},{"row":["EventE","Source3",66]},{"row":["EventF","Source4",223]}]}';
   var sampleEventData = '{"topEvents":[{"row":["Event1",13]},{"row":["Event2",23]},{"row":["Event3",33]}],"eventSourceHistory":[{"row":["Time","MDM Server","Information Analyzer","Exception Stage"]},{"row":["02:00",1000,400,1000]},{"row":["02:10",1170,460,800]},{"row":["02:20",660,1120,400]}],"eventTable":[{"row":["EventA","Source1",34]},{"row":["EventB","Source2",54]},{"row":["EventC","Source2",2]},{"row":["EventD","Source3",12]},{"row":["EventE","Source3",66]},{"row":["EventF","Source4",223]}]}';
   var list = new MessageHub.MessageList();
    list.push(sampleEventData);

   // instance.produce(topicName, list.messags)
     instance.produce(topicName, sampleEventData)
      .then(function(response) {
          console.log(response);
      })
      .fail(function(error) {
      	console.log('produce failed'); 
        throw new Error(error);
      });

  res.json(sampleEventData);
});
*/