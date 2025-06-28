import React, { useState } from 'react';
import axios from 'axios';

const MockingText = () => {
    const [text, setText] = useState('');
    const [startWithLowercase, setStartWithLowercase] = useState(false);
    const [mockedText, setMockedText] = useState('');
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        try {
            const response = await axios.post('/api/mocking-text', {
                text,
                start_with_lowercase: startWithLowercase,
            });
            setMockedText(response.data.result);
            setError('');
        } catch (err) {
            setError('An error occurred while generating mocking text.');
            setMockedText('');
        }
    };

    return (
        <div className="container">
            <h2>Mocking Text Generator</h2>
            <div className="form-group">
                <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Enter text to mock..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                ></textarea>
            </div>
            <div className="form-check">
                <input
                    type="checkbox"
                    className="form-check-input"
                    id="startWithLowercase"
                    checked={startWithLowercase}
                    onChange={(e) => setStartWithLowercase(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="startWithLowercase">
                    Start with lowercase
                </label>
            </div>
            <button className="btn btn-primary mt-3" onClick={handleGenerate}>
                Generate
            </button>
            {mockedText && (
                <div className="mt-4">
                    <h3>Mocked Text:</h3>
                    <p className="mocked-text">{mockedText}</p>
                </div>
            )}
            {error && <div className="alert alert-danger mt-3">{error}</div>}
        </div>
    );
};

export default MockingText;

