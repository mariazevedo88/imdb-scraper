/**
 * Author: Mariana Azevedo
 * Since: 26/05/2019
 */
const request = require("request-promise");
const regularRequest = require("request");
const fs = require("fs");
const cheerio = require("cheerio");
const Nightmare = require("nightmare"); //used to render the movie image, because the page use js for it
const nightmare = Nightmare({ show: true });

async function scrapeTitlesRanksAndRatings(){
    const result = await request.get("https://www.imdb.com/chart/moviemeter?ref_=nv_mv_mpm");
    const $ = await cheerio.load(result);

    const movies = $("tr").map((i, element) => {
        const title = $(element).find("td.titleColumn > a").text();
        const imdbRating = $(element).find("td.ratingColumn.imdbRating").text().trim();
        const descriptionUrl = "https://www.imdb.com" + $(element).find("td.titleColumn > a").attr("href");
        return { rank: i, title, imdbRating, descriptionUrl };
    }).get();

    return movies;
}

async function scrapePosterUrl(movies){
    const moviesWithPosterUrls = await Promise.all(
        movies.map(async movie => {
            try{
                const html = await request.get(movie.descriptionUrl);
                const $ = await cheerio.load(html);
                movie.posterUrl = 
                    "https://www.imdb.com" + $("div.poster > a").attr("href");
                return movie;
            }catch(e){
                //console.log(e);
            }
        })
    );

    return moviesWithPosterUrls;
}

async function scrapePosterImageUrl(movies){
    for (var i = 0; i < movies.length; i++){
        try{
            const posterImageUrl = await nightmare
            .goto(movies[i].posterUrl)
            .evaluate(() => 
                $("#photo-container > div > div:nth-child(2) > div > div.pswp__scroll-wrap > div.pswp__container > div:nth-child(2) > div > img:nth-child(2)"
                ).attr("src"));
            movies[i].posterImageUrl = posterImageUrl;
            savePosterImageToDisk(movie);
            console.log(movies[i]);
        }catch(e){
            console.log(e);
        }
    }
    return movies;
}

async function savePosterImageToDisk(movie){
    regularRequest.get(movie.posterImageUrl).pipe(fs.createWriteStream(`posters/${movie.rank}.png`));
}

async function main(){
    let movies = await scrapeTitlesRanksAndRatings();
    movies = await scrapePosterUrl(movies);
    movies = await scrapePosterImageUrl(movies);
}

main();
