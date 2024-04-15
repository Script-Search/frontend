'use client';
import { useEffect } from "react";
import Image from 'next/image';
import React, { useState } from "react";
import ReactPaginate from 'react-paginate';
import { COMMON_WORDS, SPECIAL_CHARS, WORD_LIMIT, CHARACTER_LIMIT } from "../utils/validation";
import Card from "../components/card";
import InMemoryCache from "../components/cache";
import { IResult } from "../utils/IResult";
import logo from '../../public/ScriptSearch_New_Logo.png';

const API_LINK = "https://us-central1-scriptsearch.cloudfunctions.net/transcript-api"
const CACHE_SIZE: number = 5;
const CACHE = new InMemoryCache(CACHE_SIZE);
const SLEEP_MS = 6500;
const SORT_OPTIONS = [
    { value: 'duration', label: 'Duration' },
    { value: 'channel_name', label: 'Channel Name' },
    { value: 'title', label: 'Video Title' },
    { value: 'matches', label: 'Num. Matches' },
];
// const PAGE_OPTIONS = Array.from({ length: 50 }, (_, index) => index + 1);            // array from 1 to 50
const PAGE_OPTIONS = [10, 15, 25, 50, 100];

export default function Home() {
    const [searchResults, setSearchResults] = useState<IResult[]>([]);
    const [sortField, setSortField] = useState("upload_date");
    const [sortAsc, setSortAsc] = useState(false);
    const [loadingType, setLoadingType] = useState("");
    const [error, setError] = useState("");
    const [pageLoaded, setPageLoaded] = useState(false);

    // const itemsPerPage = 12;
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const pageCount = Math.ceil(searchResults.length / itemsPerPage);
    const [itemOffset, setItemOffset] = useState(0);
    const [endOffset, setEndOffset] = useState(itemsPerPage);
    const [currentItems, setCurrentItems] = useState(searchResults.slice(itemOffset, endOffset));
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        setPageLoaded(true);
    }, [pageLoaded]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, []);

    useEffect(() => {
        if (searchResults.length > 0) {
            handleHits({ hits: searchResults });
        }
    }, [sortField, sortAsc]);

    useEffect(() => {
        paginate(searchResults);
    }, [itemsPerPage]);

    // generic function to handle errors
    const handleError = (error: any) => {
        // clears results, removes loading icon, and displays error message
        setLoadingType("");
        setError(error);
        setSearchResults([]);
    }

    // wait function
    function sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // make backend request when 'enter' is pressed
    const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && loadingType.length === 0) {
            backendConnect();
        }
    };

    // set field to sort by when dropdown selection changes
    const handleSortDropdownChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSortField(event.target.value);
    };
    
    // set field to sort by when dropdown selection changes
    const handlePageDropdownChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(event.target.value));
    };

    // set loading text on button depending on stage of search
    const loadingText = () => {
        if (loadingType === "stage 1") {
            return "Populating Database...";
        }
        else if (loadingType === "stage 2") {
            return "Searching Database...";
        }
        return "Search";            // default button text
    };

    // basic steps to be performed on hits returned from search
    function handleHits(data: { hits: IResult[] }) {
        setLoadingType("");         // clear loading icon
        if (!data || !data["hits"])
            throw "Hits data was null";
        setError((data["hits"].length === 0) ? "No results found." : "");       // inform user of empty results
        if (data["hits"].length > 0) {
            sortResultsByField(data["hits"], isValidField(sortField) ? sortField : 'upload_date', sortAsc);
        }
        setSearchResults(data["hits"]);         // populate results onto page
        paginate(data["hits"]);
    }

    // initial steps to paginate search results
    function paginate(hits: IResult[]) {
        setCurrentPage(0);
        setItemOffset(0);
        setEndOffset(itemsPerPage);
        setCurrentItems(hits.slice(0, itemsPerPage));
    }

    function validateQuery(query: string) {
        // drop punctuation from query (breaks search)
        const regex = new RegExp(`[${SPECIAL_CHARS.join('\\')}]`, 'g');
        query = query.replace(regex, '');
        // replace + with " plus" to catch certain relevant edge cases
        query = query.replace(/\+/g, " plus");

        // Check if the query is a common word
        if (COMMON_WORDS.includes(query)) {
            throw "Please enter a more specific query.";
        }
        // Check if entire query is common words
        if (query.split(" ").every(word => COMMON_WORDS.includes(word))) {
            throw "Please enter a more specific query.";
        }

        // Check if the query is too long
        if (query.split(" ").length > WORD_LIMIT) {
            throw "Please enter a query with 5 or fewer words.";
        }

        // Check if the query has too many characters
        if (query.length > CHARACTER_LIMIT) {
            throw "Character limit exceeded. Please shorten your query.";
        }

        return query;
    }

    // sort search results on field provided
    function sortResultsByField(results: IResult[], fieldName: keyof IResult, ascending: boolean = false): IResult[] {
        // console.log("Sorting by " + fieldName + ":" + (ascending ? "asc" : "desc"));
        return results.sort((a, b) => {
            let comp: number;
            if (fieldName === 'matches')            // sort by number of matches
                comp = a.matches.length > b.matches.length ? -1 : a.matches.length < b.matches.length ? 1 : 0;
            if(fieldName === 'channel_name' || fieldName === 'title'){
                comp = a[fieldName].toLowerCase().localeCompare(b[fieldName].toLowerCase()) * -1;
            }
            else                                    // use standard comparison to sort (lexicographically for strings)
                comp = a[fieldName] > b[fieldName] ? -1 : a[fieldName] < b[fieldName] ? 1 : 0;

            return ascending ? comp * -1 : comp;
        });
    }

    // determine if field is contained in IResult
    function isValidField(field: any): field is keyof IResult {
        return ["title", "channel_name", "upload_date", "duration", "matches"].includes(field);
    }

    // get URL data from API
    async function urlFetch(url: string, shouldSleep: boolean = true) {
        // get cached info, if any
        let cachedURLs = CACHE.getUrls();
        let urlData = {} as any;
        try {
            if (!cachedURLs || !cachedURLs.includes(url)) {    // only query API if URL has changed
                setLoadingType("stage 1");
                // fetch URL data from API
                const urlResponse = await fetch(API_LINK, {
                    method: "POST", 
                    body: JSON.stringify({ url: url }),
                    headers: {
                        "Content-Type": "application/json",
                    }
                });
                if (!urlResponse.ok) {
                    throw "Incorrect URL, please try again.";
                }
                urlData = await urlResponse.json();
                // console.log("First response: " + JSON.stringify(urlData));
                
                // update cache with new data
                if (urlData["channel_id"])
                    CACHE.push(url, { "channel_id" : urlData["channel_id"] });
                else if (urlData["video_ids"])
                    CACHE.push(url, { "video_ids" : urlData["video_ids"] });
                
                if (shouldSleep) {
                    await sleep(SLEEP_MS);
                    console.log('Wait finished!');
                }
            } else {            // if no URL change, use cached data
                urlData = CACHE.findData(url);
                CACHE.pivot(url);
            }
        } catch (e) {
            urlData = null;
            handleError(e);
        }
        return urlData;
    }

    // search database for query, with optional URL data if applicable
    async function queryFetch(query: string, urlData: any | null) {
        try {
            let dataSend = (!urlData) ? { query: query } : urlData;
            setLoadingType("stage 2");
            // fetch search results from API
            const searchResponse = await fetch(API_LINK, {
                method: "POST", 
                body: JSON.stringify(dataSend),
                headers: {
                    "Content-Type": "application/json",
                }
            });
            if (!searchResponse.ok) {
                throw "Search failed :(";
            }
            const searchData = await searchResponse.json();
            // console.log(searchData);

            // display and paginate results
            // handleSort(searchData["hits"]);
            handleHits(searchData);
        } catch (e) {
            handleError(e);
        }
    }
    
    // create, process, and cache request(s) to backend
    const backendConnect = async () => {
        handleError("");

        // get inputs from HTML
        let urlElement = document.getElementById("link") as HTMLInputElement;
        let queryElement = document.getElementById("query") as HTMLInputElement;
        let rawQuery = queryElement.value.trim().toLowerCase();
        let url = urlElement.value;
        let query: any;

        try {
            // sanitize and validate query
            query = validateQuery(rawQuery);
        } catch (e) {
            handleError(e);
            return;
        }
        
        // if no URL given, search entire database
        if (!url && query) {
            queryFetch(query, null);
        }

        // if URL given, search just that channel/playlist/video
        else if (url && query) {
            let urlData = await urlFetch(url) as any;
            if (urlData) {
                urlData["query"] = query;          // add query to URL data
                queryFetch(query, urlData);
            }
        }

        // if only URL given, ingest transcripts into database
        else if (url && !query) {
            let temp = await urlFetch(url, false) as any;
            if (temp)
                handleError("The video(s) in your URL have been populated into the database.");
        }

        // no query given, so nothing to be done
        else {
            handleError("Please enter a query.");
        }
    }

    function Items({ currentItems } : {currentItems:IResult[]}) {
        return (
            <>
            {currentItems.map((result, index) => {
                return(
                    <Card videoInfo={result} key={index}></Card>
                );
            })
          }
          </>
        )
    }
    
    const handlePageClick = (event:any) => {
        const newOffset = (event.selected * itemsPerPage) % searchResults.length;

        setPageLoaded(false);
        setCurrentPage(event.selected);
        setItemOffset(newOffset);
        setEndOffset(newOffset + itemsPerPage);
        setCurrentItems(searchResults.slice(newOffset, newOffset + itemsPerPage));
    };
    
    return (
        <main className={`flex min-h-screen flex-col items-center justify-center pt-10 pb-24 transition-all ease-in duration-700 ${pageLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <div>
                <Image
                        className="relative invert dark:invert-0 w-64 mb-2"
                        src={logo}
                        alt="Logo"
                        width={385}
                        height={385}
                        onClick={() => window.location.reload()}
                        style={{cursor: "pointer"}}
                        title="Back to Home"
                        priority
                    />
            </div>

            <div className="">    
                <p className="text-2xl before:content-['ScriptSearch'] before:text-red-600 before:font-bold before:"> - YouTube Transcript Search</p>
            </div>

            <div className="group relative flex gap-1 items-center">
                <input 
                    type="text" 
                    id="link"
                    placeholder="Enter a video/channel/playlist link" 
                    className="border rounded border-gray-500 p-2 my-1 w-80 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    />

                <div className="p-2 absolute left-full ml-3 top-1/2 min-w-max max-w-xs rounded-lg bg-gray-300 border-2 border-gray-700 dark:bg-gray-800 dark:border-white-700 dark:text-white -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300">
                    <ul className="marker:text-red-600 list-disc list-inside">
                        <b className="text-red-600">URL Help</b>
                        <li className="ml-1 mr-1"><em>English</em> transcripts only</li>
                        <li className="ml-1 mr-1">Whole URL needed for playlists/channels</li>
                        <li className="ml-1 mr-1">Must use direct YouTube link (not shortened URLs)</li>
                        <li className="ml-1 mr-1">250 most recent videos processed</li>
                        <li className="ml-1 mr-1">If no link provided, whole database searched</li>
                    </ul>
                </div>
            </div>

            <div className="group relative flex gap-1 items-center">
                <input 
                    type="text" 
                    id="query"
                    placeholder="Enter a query"
                    className="border rounded border-gray-500 p-2 w-80 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    />
                
                <div className="p-2 absolute left-full ml-3 top-1/2 min-w-max max-w-xs rounded-lg bg-gray-300 border-2 border-gray-700 dark:bg-gray-800 dark:border-white-700 dark:text-white -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300">
                    <ul className="marker:text-red-600 list-disc list-inside">
                        <b className="text-red-600">Query Help</b>
                        <li className="ml-1 mr-1">Max 5 words, 75 characters</li>
                        <li className="ml-1 mr-1">Queries must be exactly matched in transcript</li>
                        <li className="ml-1 mr-1">Common words (i.e. &apos;the&apos;, &apos;am&apos;) can&apos;t be searched alone</li>
                        <li className="ml-1 mr-1">Special characters (except apostrophes) ignored</li>
                        <li className="ml-1 mr-1">Search is case insensitive</li>
                    </ul>
                </div>
            </div>

            <button 
                id="search" 
                onClick={() => backendConnect()} 
                className="flex justify-center items-center border border-gray-500 rounded py-2 my-1 w-80 transition-colors ease-in-out hover:bg-red-600 hover:text-white hover:border-red-700 space-x-2"
                disabled={loadingType.length > 0}
            >
                {loadingType.length > 0 && (
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle
                        cx="12" cy="12" r="10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeDasharray="15 85"
                        strokeDashoffset="0"
                    ></circle>
                </svg>
                )}
                <span>{loadingText()}</span>
            </button>

            <div className="flex justify-center gap-3 items-center my-1">
                <p>Sort By: </p>
                <select 
                    value={sortField} 
                    onChange={handleSortDropdownChange} 
                    disabled={loadingType.length > 0}
                    className="cursor-pointer flex justify-center items-center border border-gray-500 rounded py-1 my-1/4 w-32 transition-colors dark:bg-gray-800 dark:text-white ease-in-out space-x-2"
                    >
                        <option value="upload_date">Upload Date</option>
                        {SORT_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                </select>
                <p>Ascending: </p>
                <input 
                    type="checkbox"
                    className="accent-red-600"
                    checked={sortAsc}
                    onChange={() => setSortAsc(!sortAsc)}
                    disabled={loadingType.length > 0}
                />
            </div>

            {/* <div className="flex justify-center gap-3 items-center my-1">
                <p>Items Per Page: </p>
                <select 
                    value={sortField} 
                    onChange={handlePageDropdownChange} 
                    disabled={searchResults.length === 0}
                    className="cursor-pointer flex justify-center items-center border border-gray-500 rounded py-1 my-1/4 w-32 transition-colors dark:bg-gray-800 dark:text-white ease-in-out hover:bg-red-600 hover:text-white hover:border-red-700 space-x-2"
                    >
                        <option value={itemsPerPage}>{itemsPerPage}</option>
                        {PAGE_OPTIONS.map(option => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                </select>
            </div> */}

            {error.length != 0 &&
            <div>
                <p className="text-2xl font-bold my-10">{error}</p>
            </div>
            }

            {searchResults.length != 0 && 
            <>
                <div className="flex flex-row flex-wrap justify-center items-center py-4">
                    <Items currentItems={currentItems} />
                </div>
            
                <div>
                    <ReactPaginate
                    breakLabel="..."
                    nextLabel=">"
                    forcePage={currentPage}
                    onPageChange={handlePageClick}
                    pageRangeDisplayed={3}
                    marginPagesDisplayed={2}
                    pageCount={pageCount}
                    previousLabel="<"
                    renderOnZeroPageCount={null}
                    className="flex flex-row mt-4 bg-gray-300 p-5 rounded fixed bottom-0 left-0 w-screen justify-center bg-opacity-90 dark:invert"
                    pageClassName="transition-all ease-in-out duration-100 hover:scale-110"
                    previousClassName="transition-all ease-in-out duration-100 hover:scale-110"
                    nextClassName="transition-all ease-in-out duration-100 hover:scale-110"
                    breakClassName="transition-all ease-in-out duration-100 hover:scale-110"
                    pageLinkClassName="text-3xl px-2 mx-1 border-2 border-red-700 rounded text-red-700 bg-white dark:invert"
                    previousLinkClassName={`text-3xl px-2 mx-1 border-2 border-red-700 bg-red-600 text-white rounded dark:invert ${currentPage == 0 ? 'hidden' : ''}`}
                    nextLinkClassName={`text-3xl px-2 mx-1 border-2 border-red-700 rounded bg-red-600 text-white dark:invert ${currentPage == pageCount - 1 ? 'hidden' : ''}`}
                    breakLinkClassName="text-3xl px-2 mx-1 border-2 border-red-700 rounded text-red-700 bg-white dark:invert"
                    activeLinkClassName="[&&]:bg-red-600 [&&]:text-white font-bold"
                    />
                </div>
            </>
            }
            
            <div className="w-11/12 my-5">
                <ul className="marker:text-red-600 list-disc list-inside p-2 bg-gray-300 border-2 rounded-lg border-gray-700 dark:bg-gray-800 dark:border-white-700 dark:text-white">
                <b className="text-red-600">Welcome to ScriptSearch! This tool will allow you to search the transcripts of a specified YouTube channel or playlist.</b>
                <li className="ml-5">To search a specific channel or playlist for a certain phrase, give us the link of the channel/playlist in question in the first box, then enter your query in the second box.</li>
                <li className="ml-5">To search our entire database for a certain phrase, just enter your search query.</li>
                <li className="ml-5">When the search is complete, you can click on any of the resulting videos to see all transcript matches and a corresponding timestamped link.</li>
                {/* <br></br>
                <b className="text-red-600">There are a number of restrictions that must be considered to get the most out of our application:</b>
                <li className="ml-5">Our search ignores case, and queries are matched <em>exactly</em> with portions of the transcript.</li>
                <li className="ml-5">When providing a channel or playlist link, it must be a direct YouTube link (i.e. &apos;youtube.com&apos; or &apos;youtu.be&apos;, NOT tinyurls or shortened links).</li>
                <li className="ml-5">We only search the 250 most recent videos in the link provided, and our search will return at most 250 results.</li>
                <li className="ml-5">Only English language transcripts are searched by our application.</li>
                <li className="ml-5">Queries must be 5 words or less and shorter than 75 characters.</li>
                <li className="ml-5">Searching common words such as &apos;the&apos; or &apos;a&apos; is not allowed.</li> */}
                </ul>
            </div>

        </main>
    );
}
