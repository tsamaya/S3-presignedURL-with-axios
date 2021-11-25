require('dotenv').config();
const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');

const s3 = new AWS.S3({
  // region: 'eu-west-1', // Put your aws region here
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const app = express();
const port = 3001;

function generateId() {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!-.*()';
  const length = 10;

  const charactersLength = characters.length;
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `${date}_${result}`;
}

app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/getputurl', async (req, res) => {
  console.info(`[getputurl] with key=${req.query.key}, type=${req.query.type}`);
  const presignedS3Url = s3.getSignedUrl('putObject', {
    Bucket: process.env.BUCKET_NAME,
    Key: req.query.key,
    // ContentType: 'application/octet-stream',
    ContentType: req.query.type,
    // ContentType: 'multipart/form-data',
    Expires: 300,
  });
  console.info(presignedS3Url);
  res.send({ url: presignedS3Url });
});

app.get('/getuploadurl', (req, res) => {
  console.info(
    `[getuploadurl] with key=${req.query.key}, type=${req.query.type}`
  );
  const fileType = req.query.type;
  const filePath = generateId();
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Fields: { key: filePath, acl: 'private' },
    Conditions: [
      // content length restrictions: 0-1MB]
      ['content-length-range', 0, 1000000],
      // specify content-type to be more generic- images only
      // ['starts-with', '$Content-Type', 'image/'],
      ['eq', '$Content-Type', fileType],
    ],
    // number of seconds for which the presigned policy should be valid
    Expires: 15,
  };
  s3.createPresignedPost(params, (err, data) => {
    if (err) {
      console.error('Failed', err);
      res.status(500).send(err);
    }
    const result = { ...data, filePath };
    console.info(result);
    res.send(result);
  });
});

app.get('/geturl', (req, res) => {
  const presignedS3Url = s3.getSignedUrl('getObject', {
    Bucket: process.env.BUCKET_NAME,
    Key: req.query.key,
    Expires: 2 * 24 * 60 * 60,
  });
  console.info(presignedS3Url);
  res.send({ url: presignedS3Url });
});

app.listen(port, () => {
  console.log(`Upload microservice listening at http://localhost:${port}`);
});