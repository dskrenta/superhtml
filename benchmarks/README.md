# SuperHTML & React Feedvix Benchmarking Results 

## SuperHTML

- Loading
  - 47 ms
- Scripting
  - 23 ms
- Rendering
  - 431 ms
- Painting
  - 48 ms
- System
  - 429 ms

## React

- Loading
  - 6 ms
- Scripting
  - 512 ms
- Rendering
  - 1021 ms
- Painting
  - 65 ms
- System
  - 545 ms

## Results

- SuperHTML is faster in the scripting category due to its miminal footprint with respect to function calls and overall script size
- SuperHTML renders the example Feedvix page faster
- SuperHTML has a faster painting time also indicating a faster render
- Loading times should be ignored as both tests were done locally from development tools

## Running the demos

### React 

Install Node.js

```
$ cd benchmarks/react-app
$ npm start
```

Site will be live at http://localhost:3000

### SuperHTML

Open `bechmarks/superhtml-app/index.html` in your desired web browser
