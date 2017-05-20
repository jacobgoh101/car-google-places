const jsonfile = require('jsonfile');
const axios = require('axios');
const waterfall = require('async/waterfall');

const file = `./json/1.json`;

const key = "AIzaSyDeKjNwKDJTosG35VBa2KgL_bQAr8Sk7sU";
const location = "3.139003,101.686855";
const radius = "50000";
const keyword = "tyre";
let endResult = [];

axios.defaults.responseType = "json";

waterfall([
    (callback) => {
        axios
            .get("https://maps.googleapis.com/maps/api/place/radarsearch/json", {
            params: {
                key,
                location,
                radius,
                keyword
            }
        })
            .then((res) => {
                return res.data.results;
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
                    key,
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

                    let website = result.website
                        ? result.website
                        : "";
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
                    if(result.photos && result.photos.length) {
                        result.photos.map(photo => {
                            photos.push(photo.photo_reference);
                        });
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
        throw err;
    }
    let endObj = {
        result: endResult
    };
    jsonfile.writeFile(file, endObj, function (err) {
        if (err) 
            console.error(err);
        console.log("Formatted results successfully saved into " + file);
    });
});