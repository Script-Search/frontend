import React, { useState } from 'react';

interface QueryInputProps {
    onEnterPress: (query: string) => void;       // function to handle Enter press, to be provided by parent component
    onInputChange: (value: string) => void;      // function to handle input change, to be provided by parent component
}
const QueryInput: React.FC<QueryInputProps> = ({ onEnterPress, onInputChange }) => {
    const [query, setQuery] = useState('');

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onEnterPress(query);         // Call the passed handler
        }
    };
    
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;
        const words = inputValue.split(/\s+/).filter(Boolean); // Split by spaces and filter out empty entries

        let newQuery = inputValue;
        if (words.length > 5) {
            newQuery = words.slice(0, 5).join(' '); // Keep only the first 5 words
            // Optionally, provide feedback to the user here
            console.log('Only up to 5 words are allowed.');
        }

        setQuery(newQuery);
        onInputChange(newQuery);
    };

    return (
        <input 
            type="text" 
            value={query} 
            onChange={handleInputChange} 
            onKeyUp={handleKeyPress}
            placeholder="Enter a query"
            className="border rounded border-gray-500 p-2 w-64 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
    );
};

export default QueryInput;
