const { jsPDF } = require("jspdf");
const fs = require("fs");
const json2xls = require("json2xls");
const puppeteer = require("puppeteer");
const readline = require('readline');
var nodemailer = require('nodemailer');
let name = null;
if (process.argv.length > 2) {
    name = process.argv[2];
}

(
    async function () {

        const browser = await puppeteer.launch({
            headless: false,
            slowMo: 5,
            defaultViewPort: null,
            args: ["--start-maximized"],
        });


        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'riya14rani@gmail.com',
                pass: 'riyarani@14'
            }
        });

        let data = [];
        let time = [];
        let moviesName = [];
        let moviesRating = [];
        let watchLink = [];
        let allReviewLinks = [];
        const page = await browser.newPage();
        await page.setViewport({ width: 0, height: 0 });
        await page.goto("https://www.imdb.com/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.imdb.com%2Fregistration%2Fap-signin-handler%2Fimdb_us&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=imdb_us&openid.mode=checkid_setup&siteState=eyJvcGVuaWQuYXNzb2NfaGFuZGxlIjoiaW1kYl91cyIsInJlZGlyZWN0VG8iOiJodHRwczovL3d3dy5pbWRiLmNvbS8_cmVmXz1sb2dpbiJ9&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&tag=imdbtag_reg-20");
        //enter mail
        await page.waitForSelector("#ap_email");
        await page.click("#ap_email");
        await page.type("#ap_email", "tefajof943@d4wan.com");
        //enter password 
        await page.click("#ap_password");
        await page.type("#ap_password", "riyarani");
        //signin
        await page.click(" #signInSubmit");
        // opens menu
        await page.waitForSelector("#imdbHeader-navDrawerOpen--desktop");
        await Promise.all([
            page.click("#imdbHeader-navDrawerOpen--desktop"),
            page.waitForNavigation(),
        ]);
        //return link of toprated movies page link 
        await page.waitForSelector(".ipc-list__item.nav-link.NavLink-sc-19k0khm-0.dvLykY.ipc-list__item--indent-one", { visible: true });
        let topRatedMovies = await page.evaluate(function () {
            let intermediateLink = document.querySelectorAll(".ipc-list__item.nav-link.NavLink-sc-19k0khm-0.dvLykY.ipc-list__item--indent-one");
            let actualLink = "https://www.imdb.com/" + intermediateLink[2].getAttribute("href");
            return actualLink;
        })
        //goto top rated movies page and fatch top 10 movies 
        //with ratings and watch links and if they are not added in watchlist then add
        //otherwise do nothing
        await page.goto(topRatedMovies);
        await page.waitForSelector("table tr");
        let detailsOfTopTen = await page.evaluate(function () {
            let topRatedMoviesName = [];
            let topRatedMoviesRating = [];
            let watchLink = [];
            let alltrs = document.querySelectorAll("table tr");
            for (let i = 1; i <= 10; i++) {
                let alltd = alltrs[i].querySelectorAll("td");
                let anchorOfMovieLink = alltd[1].querySelector("a");
                topRatedMoviesName.push(anchorOfMovieLink.innerText);
                topRatedMoviesRating.push(alltd[2].innerText);
                // to add in watchlist
                let watchTag = alltd[4].querySelector("div>div");
                if (watchTag != null && watchTag.className == "wl-ribbon standalone not-inWL") {
                    watchTag.click();
                }
                watchLink.push("https://www.imdb.com" + alltd[1].querySelector("a").getAttribute("href"));
            }
            return { topRatedMoviesName, topRatedMoviesRating, watchLink }
        })

        moviesName = detailsOfTopTen.topRatedMoviesName;
        moviesRating = detailsOfTopTen.topRatedMoviesRating;
        watchLink = detailsOfTopTen.watchLink;

        //to get link of all reviewpages
        for (let i = 0; i < watchLink.length; i++) {
            let link = watchLink[i];
            await page.goto(link);
            let reviewLink;
            let check = [];
            //to check quicklink exist or not
            check = await page.$$(".quicklink");
            //if quicklink exist
            if (check.length != 0) {
                reviewLink = await page.evaluate(function () {
                    let alllist = document.querySelectorAll(".quicklink");
                    let link = alllist[2].getAttribute("href");
                    return "https://www.imdb.com" + link
                })
            }
            //if quicklink does not exist
            else {
                let forConcatenation = link.split("?");
                await page.waitForSelector(".ipc-link.ipc-link--baseAlt.ipc-link--inherit-color");
                let intermediateReviewLink = await page.evaluate(function () {
                    let alltd = document.querySelectorAll(".ipc-link.ipc-link--baseAlt.ipc-link--inherit-color");
                    let link = alltd[3].getAttribute("href");
                    return link;
                })
                reviewLink = forConcatenation[0] + intermediateReviewLink;
            }

            //pdf of reviews
            await page.goto(reviewLink);
            await page.waitForSelector(".lister-item-content")
            let topTwoReview = await page.evaluate(function () {
                let topFiveReview = [];
                let allLi = document.querySelectorAll(".lister-item-content");
                for (let i = 0; i < 2; i++) {
                    let title = allLi[i].querySelector("a.title").innerText;
                    let text = allLi[i].querySelector(".text.show-more__control").innerText

                    let finalReview = `${title}\n
               ${text}`;
                    topFiveReview.push("\n" + (i + 1) + ". " + finalReview);
                }
                return topFiveReview
            })
            //does movie name have special character
            let filename;
            if (moviesName[i].includes(":") == true) {
                filename = moviesName[i].replace(":", "-");
            }
            else {
                filename = moviesName[i];
            }
            let fileName = filename + ".pdf";
            createPdf(fileName, topTwoReview);
            allReviewLinks[i] = reviewLink;
        }
        //duration of movies
        for (i = 0; i < watchLink.length; i++) {
            let link = watchLink[i];
            await page.goto(link);
            let check = [];
            //to check quicklink exist or not
            check = await page.$$(".quicklink");
            //if quicklink exist
            if (check.length != 0) {
                time[i] = await page.evaluate(function () {
                    let time = document.getElementsByTagName("time")[0].innerText
                    return time;
                })
            }
            else {
                time[i] = await page.evaluate(function () {
                    let allLi = document.querySelectorAll(".ipc-inline-list__item");
                    let time = allLi[2].innerText;
                    return time;
                })
            }
        }
        function createJson(moviesName, rating, watchlink, reviewlink, duration) {
            let detail = {
                Name: moviesName,
                Rating: rating,
                Duration: duration,
                Reviews: reviewlink,
                watch: watchlink,
            };
            data.push(detail);
        }
        function createPdf(fileName, topTwoReview) {
            const doc = new jsPDF(
                {
                    format: 'a3'
                });
            doc.setFontSize(12);
            doc.setFont("courier", "italic");
            doc.setTextColor(0, 51, 102);
            let splitText = doc.splitTextToSize(topTwoReview, 270);
            doc.text(10, 10, splitText);
            doc.save(fileName);
        }
        for (let i = 0; i < moviesName.length; i++) {
            createJson(moviesName[i], moviesRating[i], watchLink[i], allReviewLinks[i], time[i]);
        }

        fs.writeFileSync("data1.json", JSON.stringify(data));
        //create excel file
        let excel = json2xls(data);
        fs.writeFileSync('data.xlsx', excel, 'binary');
        
        //check movie entered or not
        //if yes
        if (name != null) {
            await page.goto("https://www.imdb.com/");
            await page.waitForSelector("#suggestion-search");
            await page.click("#suggestion-search");
            await page.type("#suggestion-search", name);
            
            await Promise.all([
                page.keyboard.down("Enter"),
                page.waitForNavigation(),
            ]);
            
            await page.waitForSelector(".result_text>a");
            let reviewsconcat = await page.evaluate(function () {
                let link = document.querySelector(".result_text>a").getAttribute("href");
                return link;
            })
            
            let finalConcat = reviewsconcat.split("?");
            await Promise.all([
                page.click(".result_text>a"),
                page.waitForNavigation(),
            ]);
            
            let checkSlector = []
            checkSlector = await page.$$(".AggregateRatingButton__RatingScore-sc-1il8omz-1.fhMjqK");
            let objForSearched = {};
            if (checkSlector.length != 0) {
                await page.waitForSelector(".AggregateRatingButton__RatingScore-sc-1il8omz-1.fhMjqK");
                objForSearched = await page.evaluate(function () {
                    let rating = document.querySelector(".AggregateRatingButton__RatingScore-sc-1il8omz-1.fhMjqK").innerText;
                    let allli = document.querySelectorAll(".TitleBlock__TitleMetaDataContainer-sc-1nlhx7j-2.hWHMKr>ul>li");
                    let time = allli[2].innerText;
                    //to add in watchlist
                    document.querySelector(".ipc-btn__text").click();
                    let watchAnchor = document.querySelector(".ipc-button.ipc-button--full-width.ipc-button--center-align-content.ipc-button--large-height.ipc-button--core-accent1.ipc-button--theme-baseAlt.WatchBox__PrimaryWatchOptionButton-sc-1kx3ihk-0.cLzvdD");
                    let watchLink = watchAnchor.getAttribute("href");
                    let allAnchor = document.querySelectorAll(".ipc-link.ipc-link--baseAlt.ipc-link--inherit-color");
                    let review = allAnchor[3].getAttribute("href");
                    return { rating, time, watchLink, review }

                })
                objForSearched.review = "https://www.imdb.com" + finalConcat[0] + obj.review

            }
            else {
                objForSearched = await page.evaluate(function () {
                    let rating = document.querySelector('[itemprop="ratingValue"]').innerText;
                    let allTime = document.querySelectorAll('[datetime="PT134M"]');
                    let time = allTime[0].innerText;
                    //add to watchlist
                    document.querySelector(".ipc-button.ipc-secondary-button.uc-add-wl-button-icon--add.watchlist--title-main-desktop.ipc-button--core-base.ipc-button--on-textPrimary.ipc-button--single-padding.ipc-button--default-height").click();
                    let watchBtn = document.querySelector(".ipc-button.buybox__button.promoted-watch-ad.ipc-button--core-base.ipc-button--full-width.ipc-button--default-height");
                    let watchLink = watchBtn.getAttribute("data-ipc-data");
                    let review = "https://www.imdb.com/" + document.querySelectorAll(".quicklink")[2].getAttribute("href");
                    return { rating, time, watchLink, review }
                })

            }
           let dataString = "name= " + name + "\n" + "ratings= " + objForSearched.rating + "\n" + "duration= " + objForSearched.time + "\n" + "reviews=" + objForSearched.review + "\n" + "watchLink= " + objForSearched.watchLink;
            createPdf("serched.pdf", dataString);
            
            var mailOptions = {
                from: 'riya14rani@gmail.com',
                to: 'rajputrinshu@gmail.com',
                subject: 'Sending Email using Node.js',
                text: 'your pdf',
                attachments: [
                  {
                      filename: "serched.pdf",
                       path: "D:" +"\serched.pdf" ,
                      cid: 'uniq-serched.pdf'
                  }
              ]
              };
              transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
              });
              browser.close();
        }
        //if movie not entered
        else {
            browser.close();
        }


    }
)();
