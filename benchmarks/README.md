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

- SuperHTML is much faster in the scripting category due to it's small size
- SuperHTML renders the example Feedvix page faster
- SuperHTML results in the painting time also indicating a faster render
- Loading times should be ignored as both tests were done locally from development tools