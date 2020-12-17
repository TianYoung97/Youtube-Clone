const aws = require('aws-sdk');
const fs = require('fs');

// Enter copied or downloaded access ID and secret key here
const ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET = process.env.AWS_SECRET_ACCESS_KEY;

// The name of the bucket that you have created
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

const s3 = new aws.S3({
    accessKeyId: ID,
    secretAccessKey: SECRET
});



const params = {
    Bucket: BUCKET_NAME,
    CreateBucketConfiguration: {
        // Set your region here
        LocationConstraint: "us-east-2"
    }
};

const uploadFile = (filePath, fileName) => {
    // Read content from the file
    const fileContent = fs.readFileSync(filePath);
    let url = '';
    let result = {success: false, err: 'Something is wrong!'}
    // Setting up S3 upload parameters
    const params = {
        Bucket: BUCKET_NAME,
        Body: fileContent,
        Key: fileName,
        Expires: 60,
        // ContentType: fileType,
        ACL: 'public-read'
    };

    // Uploading files to the bucket
    return new Promise((resolve, reject) => {
        s3.upload(params, function(err, data) {
            if (err) {
                result = {success: false, err: err};
                reject(result);
            } else {
                console.log(`File uploaded successfully. ${data.Location}`);
                url = data.Location;
                result = {success: true, url: url}
                resolve(result)
            }
        });
    })
};

module.exports = uploadFile;

