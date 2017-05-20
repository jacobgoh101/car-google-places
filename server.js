require('dotenv').config();
const express = require('express');
const axios = require('axios');
const waterfall = require('async/waterfall');

const app = express();

const apiKey = process.env.API_KEY;

app.get('/', (appReq, appRes) => {
    appRes.end('/googleplaces?location=3.139003,101.686855&radius=50000&keyword=tyre');
})
app.get('/googleplaces', (appReq, appRes) => {
    appRes.setHeader('Content-Type', 'application/json');

    const location = appReq.query.location;
    const radius = appReq.query.radius;
    const keyword = appReq.query.keyword;
    let endResult = [];

    axios.defaults.responseType = "json";

    waterfall([
        (callback) => {
            axios
                .get("https://maps.googleapis.com/maps/api/place/radarsearch/json", {
                    params: {
                        key: apiKey,
                        location,
                        radius,
                        keyword
                    }
                })
                .then((res) => {
                    if (res.data.results && res.data.results.length) {
                        return res.data.results;
                    } else {
                        return callback(`${JSON.stringify(res.data)}`);
                    }
                })
                .then((results) => {
                    return callback(null, results);
                })
                .catch(err => {
                    throw err;
                });
        },
        (results, callback) => {
            results.map((result, index) => {
                let placeid = result.place_id;
                axios
                    .get("https://maps.googleapis.com/maps/api/place/details/json", {
                        params: {
                            key: apiKey,
                            placeid
                        }
                    })
                    .then((res) => {
                        return res.data.result;
                    })
                    .then((result) => {
                        // find any result with email
                        let resultString = JSON
                            .stringify(result)
                            .toLowerCase();
                        if (resultString.indexOf('email') > -1) {
                            console.log("This place has email!!! placeid: " + placeid)
                        }

                        let website = result.website ?
                            result.website :
                            "";
                        let country,
                            city,
                            zipcode;
                        result
                            .address_components
                            .map((address_component) => {
                                if (address_component.types.indexOf('country') > -1) {
                                    country = address_component.long_name;
                                }
                                if (address_component.types.indexOf('locality') > -1) {
                                    city = address_component.long_name;
                                }
                                if (address_component.types.indexOf('postal_code') > -1) {
                                    zipcode = address_component.long_name;
                                }
                            });

                        let photos = [];
                        if (result.photos && result.photos.length) {
                            result
                                .photos
                                .map(photo => {
                                    photos.push(photo.photo_reference);
                                });
                        }

                        let weekday_text = [];
                        if (result.opening_hours && result.opening_hours.weekday_text && result.opening_hours.weekday_text.length) {
                            weekday_text = result.opening_hours.weekday_text;
                        }

                        let types = [];
                        if(result.types && result.types.length) {
                            types = result.types;
                        }

                        let singleEndResult = {
                            name: result.name,
                            address: result.formatted_address,
                            phone: result.formatted_phone_number,
                            country,
                            city,
                            zipcode,
                            latitude: result.geometry.location.lat,
                            longitude: result.geometry.location.lng,
                            website,
                            photos,
                            weekday_text,
                            types,
                            placeid
                        };
                        return endResult.push(singleEndResult);
                    })
                    .then((e) => {
                        if (endResult.length == results.length) {
                            console.log("exit async waterfall");
                            return callback(null);
                        }
                    })
                    .catch((err) => {
                        throw err;
                    });
            });
        }
    ], (err) => {
        if (err) {
            console.log(err);
            appRes.end(err);
        }
        const endObj = {
            result: endResult
        };
        appRes.json(endResult);
    });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});