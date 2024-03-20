import React, { useState } from 'react';

interface QueryInputProps {
    onEnterPress: (query: string) => void;       // function to handle Enter press, to be provided by parent component
    onInputChange: (value: string) => void;      // function to handle input change, to be provided by parent component
    onInputError: (value: boolean) => void;      // function to handle input error, to be provided by parent component
}
const QueryInput: React.FC<QueryInputProps> = ({ onEnterPress, onInputChange, onInputError }) => {
    const [query, setQuery] = useState('');
    const WORD_LIMIT = fetch("https://us-central1-scriptsearch.cloudfunctions.net/transcript-api").then(response => {
        if (!response.ok) {
            throw new Error("couldn't default fetch from API");
        }
        return response.json();
    }).then(data => {
        return data["word_limit"];
    })

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onEnterPress(query);         // Call the passed handler
        }
    };
    
    const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;
        const words = inputValue.split(/\s+/).filter(Boolean); // Split by spaces and filter out empty entries

        let newQuery = inputValue;
        const actualWordLimit = await WORD_LIMIT;
        if (words.length >= actualWordLimit) {
            newQuery = words.slice(0, actualWordLimit).join(' '); // Keep only the first 5 words
            onInputError(true);
        } else {
            onInputError(false);
        }

        setQuery(newQuery);
        onInputChange(newQuery);
    };

    return (
        <input 
            type="text" 
            value={query} 
            onChange={handleInputChange}        // onChange allows catching copy-paste into input
            onKeyUp={handleKeyPress}
            placeholder="Enter a query"
            className="border rounded border-gray-500 p-2 w-80 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
    );
};

export default QueryInput;
