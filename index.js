const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
//creating writeStream for events.csv
const writeStream = fs.createWriteStream('events.csv');

//Writing Headers for events.csv
writeStream.write(`Date,Event,Price \n`);

//Initiate Express
const app = express();

//Middleware for body-parser
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json());

//Set Public Folder
app.use(express.static(path.join(__dirname, 'public')));

//Set Public Folder
app.use(express.static(path.join(__dirname, 'public')));

//Load View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');



//F U N C T I O N S

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


function scrape(city){
    //Since BookMyShow's search query url functions like this.
    //A change in city changes only the city part of the url, everything else stays intact. Neat.
    const url = `https://in.bookmyshow.com/${city}/events`

    //Using node-fetch as fetch, to make fetch requests
    return fetch(url)
        .then(res => res.text()) //gives back plain HTML
        .then(body => {
            //Cheerio is like server side JQuery 
            //Here we initiate cheerio by loading the received plain HTML
            const $ = cheerio.load(body);
                // in list date is in class '.card-left'
                //                          '__evt-date-col'
                //                          '__evt-date', '__evt-month', '__evt-date-onw'
                // title is in '.card-right'
                //             '.card-title'
                // price is in '.__price'
                //All the events on BMS site are inside a class of '.card-details,
                //so am looping through all elements with this class using the each
                //method
                const container = $('.card-details');
                const events = [];
                
                // inside each element of class .card-details, the date is stored in 
                // a div of class .__evt-month and .__evt-date
                // price is in a div class of .__price
                // Title of the Event is in an h4 inside div of class .card-title
                // instead of traversing through all the children in each child of
                // container, am using the .find method of Cheerio to directly find
                // the element I need.
                // .text method strips all unnecessary HTML out of the content.
                
                container.each((i, element) => {
                    const month = $(element).find('.__evt-month').text();
                    const day = $(element).find('.__evt-date').text();
                    const date = `${day} ${month}`;
                    const eventTitle = $(element).find('.card-title').find('h4').text();  
                    const price = $(element).find('.__price').text();

                    //Creating a single event Object, with date, price and title
                    const event = {date, eventTitle, price};
                    //Adding event to events array.
                    events.push(event);
                    
                });
            return events;
        });
}


/// DATE FUNCTIONS

const getTomorrowDate = (todayDate, tomorrowDate) => {
    //setting date tomorrow as today + 1
    tomorrowDate.setDate(todayDate.getDate()+1);
    //creating tomorrow date String
    tomorrow = `${tomorrowDate.getDate()} ${months[tomorrowDate.getMonth()]}`
    return tomorrow;
}

//.getDay method returns the day of the week 0 - 6
    //If today is tuesday, day of the week will be 2, sunday being 0
    //To find the date of coming saturday,
    //get todays date, get todays day(0 - 6),
    // Subtract day from date. 
    //We get the date of last Sunday.
    //To get this saturday's date, add 6;
    // for Sunday's date, add 7
const getWeekends = (todayDate, weekendDateSat, weekendDateSun) => {
    let weekendDates = [];
    weekendDateSat.setDate(todayDate.getDate()+ 6 - todayDate.getDay());
    weekendDateSun.setDate(todayDate.getDate()+ 7 - todayDate.getDay());
    let sat = `${weekendDateSat.getDate()} ${months[weekendDateSat.getMonth()]}`;
    let sun = `${weekendDateSun.getDate()} ${months[weekendDateSun.getMonth()]}`;
    weekendDates.push(sat);
    weekendDates.push(sun);
    return weekendDates;
}

const getThisSunday = (todayDate, weekendDateSun) => {
    let weekendDates = [];
    weekendDateSun.setDate(todayDate.getDate()+ 7 - todayDate.getDay());
    let sun = `${weekendDateSun.getDate()} ${months[weekendDateSun.getMonth()]}`;
    weekendDates.push(sun);
    return weekendDates;
}

const getNextWeekends = (todayDate, nextSatDate, nextSunDate) => {
    //Similar to previous algorithm of finding dates.
    // because we need the date for next weekend, we just add 7 to both 
    // instead of 6, add 13. And 14, instead of 7.
    let nextWeekendDates = [];
    nextSatDate.setDate(todayDate.getDate()+ 13 - todayDate.getDay());
    nextSunDate.setDate(todayDate.getDate()+ 14 - todayDate.getDay());
    let nextSat = `${nextSatDate.getDate()} ${months[nextSatDate.getMonth()]}`;
    let nextSun = `${nextSunDate.getDate()} ${months[nextSunDate.getMonth()]}`;
    
    //Pushing these dates into an array, to later filter
    // the events that have matching dates
    nextWeekendDates.push(nextSat);
    nextWeekendDates.push(nextSun);
    //console.log('DATE');
    //console.log(nextSat);
    return nextWeekendDates;
}

const getNextSunday = (todayDate, nextSunDate) => {
    let nextWeekendDates = [];
    nextSunDate.setDate(todayDate.getDate()+ 14 - todayDate.getDay());
    let nextSun = `${nextSunDate.getDate()} ${months[nextSunDate.getMonth()]}`;
    nextWeekendDates.push(nextSun);
    return nextWeekendDates;
}

// Filtering out events that do not match with
    // selected dates
    // weekendDates & nextWeekendDates, which were previously 
    // populated arrays have dates of this and next week.
    // If event.date is not in this array it gets filtered out.

const filterEvents = (events, today, tomorrow, weekendDates, nextWeekendDates) =>{
    let filteredEvents = [];
    if(today !== ''){
        let eventsToday = events.filter(event => event.date === today);
        filteredEvents = [...eventsToday]
    }
    if(tomorrow !== ''){
        let eventsTomorrow = events.filter(event => 
            event.date === tomorrow);
        filteredEvents = [...eventsTomorrow]
    }
   if(weekendDates.length !== 0){
       //console.log(weekendDates);
        let eventsThisWeekend = events.filter(event => 
            weekendDates.indexOf(event.date)!==-1);
        filteredEvents = [...eventsThisWeekend];
   }
   if(nextWeekendDates.length !== 0){
        let eventsNextWeekend = events.filter(event => 
            nextWeekendDates.indexOf(event.date)!==-1);
        filteredEvents = [...eventsNextWeekend];
   }                
    return filteredEvents;
}

////  R O U T E S


// Home route
app.get('/', (req, res) => {
    res.render('home');
}); 

// Post Home route
app.post('/', (req, res) => {
    console.log(req.body);
    let city = '';
    //All cities appear as it is in BMS search URL, except Delhi,
    //so this code takes care of that.
    if(req.body.city === 'Delhi NCR'){
        city = 'national-capital-region-ncr'
    }
    else city = req.body.city.toLowerCase();

    //Keeping track of Dates with respect to today's date
    let today = '';
    let tomorrow = '';
    let todayDate = new Date();
    let tomorrowDate = new Date();
    let weekendDateSat = new Date();
    let weekendDateSun = new Date();
    let weekendDates = [];
    let nextSatDate = new Date();
    let nextSunDate = new Date();
    let nextWeekendDates = [];

        //All these if conditions check if a particular date is selected.
        if(req.body.date === 'Today'){ 
            today =  `${todayDate.getDate()} ${months[todayDate.getMonth()]}`;
        }
        if(req.body.date === 'Tomorrow'){
           tomorrow = getTomorrowDate(todayDate, tomorrowDate);
           //console.log(tomorrow);
        }
        
        if(req.body.date === 'This Weekend'){

            //If today is Sunday, which is '0'th day, then the weekend will only 
            //have one day, i.e Sunday.
            //This condition makes sure it is not Sunday today.
            //If it isn't Sunday, it calculates dates for Saturday and Sunday
            if(todayDate.getDay() !== 0){   
                weekendDates = getWeekends(todayDate, weekendDateSat, weekendDateSun);
                console.log(weekendDates);
            }
            else if(todayDate.getDay() === 0){
                weekendDates = getThisSunday(todayDate, weekendDateSun);
            }
        }
        if(req.body.date === 'Next Weekend'){
            
            if(todayDate.getDay() !== 0){
                nextWeekendDates = getNextWeekends(todayDate, nextSatDate, nextSunDate);
                console.log(nextWeekendDates);
            }
            else if(todayDate.getDay() !== 0){
                nextWeekendDates = getNextSunday(todayDate, nextSunDate);
            }
        }
            

    //scrape functions returns fetch, which is promise returning all events from BMS
    scrape(city)
        .then(events => { 

            //filtering the events returned from BMS using function filterEvents
            events = filterEvents(events, today, tomorrow, 
                                    weekendDates, nextWeekendDates);
            //console.log(events);

            //After filtering the events
            //Write row to CSV using forEach method
            events.forEach( event => {
                writeStream.write(`"${event.date}", 
                                    "${event.eventTitle}", 
                                    "${event.price}" \n`);
            });
                           
            //rendering the 'home' view using PUG Template engine
            // Also passing the events to the page
            res.render('home', {
                events
            })
        });

});


// Download Route, to send the events.csv for download
app.get('/download', (req, res) => {
    //.download method allows to send a downloadable file as response
    res.download(__dirname+'/events.csv' , 'events.csv');
})

//Server listens on port 3000
app.listen(3000, () => console.log('Server Started'));


// ===================================================================================
// ===============================  E  N  D  =========================================
// ===================================================================================



//If multiple dates could be selected, with checkboxes
//If only one date is selected
    //All algorithms are similar to the previous if statements
    // else{
    //     if(req.body.date === 'Today'){
    //         today =  `${todayDate.getDate()} ${months[todayDate.getMonth()]}`;
    //     }
    //     if(req.body.date === 'Tomorrow'){
    //         tomorrowDate.setDate(todayDate.getDate()+1);
    //         tomorrow = `${tomorrowDate.getDate()} ${months[tomorrowDate.getMonth()]}`
    //         console.log('DATE');
    //         console.log(tomorrow);
    //     }
    //     if(req.body.date === 'This Weekend'){
    //         if(todayDate.getDay() !== 0){
    //             weekendDateSat.setDate(todayDate.getDate()+ 6 - todayDate.getDay());
    //             weekendDateSun.setDate(todayDate.getDate()+ 7 - todayDate.getDay());
    //             sat = `${weekendDateSat.getDate()} ${months[weekendDateSat.getMonth()]}`;
    //             sun = `${weekendDateSun.getDate()} ${months[weekendDateSun.getMonth()]}`;
    //             weekendDates.push(sat);
    //             weekendDates.push(sun);
    //         }
    //         else if(todayDate.getDay() === 0){
    //             weekendDateSun.setDate(todayDate.getDate()+ 7 - todayDate.getDay());
    //             sun = `${weekendDateSun.getDate()} ${months[weekendDateSun.getMonth()]}`;
    //             weekendDates.push(sun);
    //         }
    //     }
    //     if(req.body.date === 'Next Weekend'){
    //         if(todayDate.getDay() !== 0){
    //             nextSatDate.setDate(todayDate.getDate()+ 13 - todayDate.getDay());
    //             nextSunDate.setDate(todayDate.getDate()+ 14 - todayDate.getDay());
    //             nextSat = `${nextSatDate.getDate()} ${months[nextSatDate.getMonth()]}`;
    //             nextSun = `${nextSunDate.getDate()} ${months[nextSunDate.getMonth()]}`;
    //             nextWeekendDates.push(nextSat);
    //             nextWeekendDates.push(nextSun);
    //             //console.log('DATE');
    //             //console.log(nextSat);
    //         }
    //         else if(todayDate.getDay() !== 0){
    //             nextSunDate.setDate(todayDate.getDate()+ 14 - todayDate.getDay());
    //             nextSun = `${nextSunDate.getDate()} ${months[nextSunDate.getMonth()]}`;
    //             nextWeekendDates.push(nextSun);
    //         }
    //     }
    // }