//Libs and args
const express = require('express')
const port = process.env.NODE_PORT || 3000
const zipAPIKey=process.env.ZIP_ZPI_KEY || "YNT9w6CnPdUeIUUiC3eC4BdxoOP3trYYnvh90AMr1hovnEXlhtVfcN3dlhLaknFf"

//Xray
const AWSXRay = require('aws-xray-sdk-core');
const xrayExpress = require('aws-xray-sdk-express');
const https = AWSXRay.captureHTTPs(require('https'));
AWSXRay.enableAutomaticMode();

//Setup ExpressJS Server
const app = express()
app.use(xrayExpress.openSegment('zipCode'));

app.get('/',(req,res)=>res.status(200).send("200/OK"));

app.get('/:zipCode', (req, res) =>{
    var segment = AWSXRay.getSegment();
    let url= "https://www.zipcodeapi.com/rest/"+zipAPIKey+"/info.json/" + req.params.zipCode + "/radians";
    https.get(url).then((zipRes)=>{
        if(zipRes.error_msg){
            segment.a
            res.status(400).json(zipRes)
        }   
        else{
            segment.addMetadata('city', zipRes.data.city,"ResponseData");
            segment.addAnnotation('state', zipRes.data.state,"ResponseData");
            res.status(200).json(zipRes.data)
        }
    });
})


//Start the server
app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
app.use(xrayExpress.closeSegment());