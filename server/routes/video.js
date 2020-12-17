const express = require('express');
const router = express.Router();
const multer = require('multer');
var ffmpeg = require('fluent-ffmpeg');
const fs = require("fs")
const aws = require('aws-sdk');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const uploadHelper = require('../uploadHelper')
const { Video } = require("../models/Video");
const { Subscriber } = require("../models/Subscriber");
const { auth } = require("../middleware/auth");

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`)
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        if (ext !== '.mp4') {
            return cb(res.status(400).end('only jpg, png, mp4 is allowed'), false);
        }
        cb(null, true)
    }
})

var upload = multer({ storage: storage }).single("file")

const S3_BUCKET = process.env.S3_BUCKET;
aws.config.region = 'us-east-2';

//=================================
//             User
//=================================

router.post("/uploadfiles", (req, res) => {

    upload(req, res, err => {
        
        if (err) {
            console.log(err)
            return res.json({ success: false, err })
        }
        console.log('Uploading Video!');
        uploadHelper(res.req.file.path, res.req.file.filename)
        .then(result => {
            return res.json({ success: true, localFilePath: res.req.file.path, FileName: res.req.file.filename,
                remoteFilePath: result.url})
        })
        .catch(result => {
            return res.json({ success: false, err: result.err})
        })

    })

});


router.post("/thumbnail", (req, res) => {

    let thumbsFilePath ="";
    let fileDuration ="";
    let thumbsFileName =""
    ffmpeg.ffprobe(req.body.filePath, function(err, metadata){
        console.dir(metadata);
        console.log(metadata.format.duration);

        fileDuration = metadata.format.duration;
    })


    ffmpeg(req.body.filePath)
        .on('filenames', function (filenames) {
            console.log('Will generate ' + filenames.join(', '))
            thumbsFilePath = "uploads/thumbnails/" + filenames[0];
            thumbsFileName = filenames[0];
        })
        .on('end', function () {
            console.log('Uploading thumbfile!');
            console.log('Screenshots taken');

            uploadHelper(thumbsFilePath, thumbsFileName)
            .then(result => {
                return res.json({ success: true, localThumbsFilePath: thumbsFilePath, fileDuration: fileDuration, remoteThumbsFilePath: result.url})
            })
            .catch(result => {
                return res.json({ success: false, err: result.err})
            })
        })
        .screenshots({
            // Will take screens at 20%, 40%, 60% and 80% of the video
            count: 1,
            folder: 'uploads/thumbnails',
            size:'320x240',
            // %b input basename ( filename w/o extension )
            filename:'thumbnail-%b.png'
        });





});


router.get("/getVideos", (req, res) => {

    Video.find()
        .populate('writer')
        .exec((err, videos) => {
            if(err) return res.status(400).send(err);
            res.status(200).json({ success: true, videos })
        })
    
});



router.post("/uploadVideo", (req, res) => {

    const video = new Video(req.body)
    video.save((err, video) => {
        if(err) return res.status(400).json({ success: false, err })
        return res.status(200).json({
            success: true 
        })
    })
});


router.post("/getVideo", (req, res) => {

    Video.findOne({ "_id" : req.body.videoId })
    .populate('writer')
    .exec((err, video) => {
        if(err) return res.status(400).send(err);
        res.status(200).json({ success: true, video })
    })
});


router.post("/getSubscriptionVideos", (req, res) => {


    //Need to find all of the Users that I am subscribing to From Subscriber Collection 
    
    Subscriber.find({ 'userFrom': req.body.userFrom })
    .exec((err, subscribers)=> {
        if(err) return res.status(400).send(err);

        let subscribedUser = [];

        subscribers.map((subscriber, i)=> {
            subscribedUser.push(subscriber.userTo)
        })


        //Need to Fetch all of the Videos that belong to the Users that I found in previous step. 
        Video.find({ writer: { $in: subscribedUser }})
            .populate('writer')
            .exec((err, videos) => {
                if(err) return res.status(400).send(err);
                res.status(200).json({ success: true, videos })
            })
    })
});

module.exports = router;
