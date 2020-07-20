//Libs and args
const express = require('express')
const port = process.env.NODE_PORT || 3000
const zipAPIKey=process.env.ZIP_ZPI_KEY || "YNT9w6CnPdUeIUUiC3eC4BdxoOP3trYYnvh90AMr1hovnEXlhtVfcN3dlhLaknFf"
const http =require('http');
const https =require('https');

//Xray
const AWSXRay = require('aws-xray-sdk-core');
const xrayExpress = require('aws-xray-sdk-express');

//Tell XRAY I want to trace outbound http/https activity
AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

//This library simplifies HTTP/HTTPS requests and is based on http and https
const axios = require('axios');

//Let XRAY handle segment data for us. Manual mode is great when we dont have the Express Middleware to help.
AWSXRay.enableAutomaticMode();

//Setup ExpressJS Server
const app = express()
app.use(xrayExpress.openSegment('zipCode'));

//The Health Check Route
app.get('/',(req,res)=>res.status(200).send("200/OK"));

//The route for /:zipCode where zipCode is a path argument
app.get('/:zipCode', (req, res) =>{

    //Get the Current XRAY Segment
    var segment = AWSXRay.getSegment();

    //Make a request to the remote API
    //Note we never actuall tell XRAY About this endpoint
    let url= "https://www.zipcodeapi.com/rest/"+zipAPIKey+"/info.json/" + req.params.zipCode + "/radians";
    axios.get(url).then((zipRes)=>{

        //Was there an error? Kick out a HTTP/400
        if(zipRes.error_msg){
            segment.addMetadata('error', zipRes.error_msg,"ResponseData");
            res.status(400).json(zipRes)
        }   

        //It worked! Lets add some metadata to the trace and return the info
        else{
            segment.addMetadata('city', zipRes.data.city,"ResponseData");
            segment.addAnnotation('state', zipRes.data.state,"ResponseData");
            res.status(200).json(zipRes.data)
        }

    //Uh Oh!
    }).catch((err)=>{
        segment.addMetadata('error', err,"ResponseData");
        res.status(400).json(zipRes)
    });
})


//Start the server
app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
//Tidy up
app.use(xrayExpress.closeSegment());