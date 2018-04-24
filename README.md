# Texure2Image

Generate a cube like image from three textures without canvas, which could allow a server side system to do this work.

`Texture2Image` uses [ndarray](https://github.com/scijs/ndarray) to load image data, then use this data to transform the textures.

## usage 

Install and import it as a module. 
```
npm i texture2cube 
```

Here shows a basic example: 
```js
var CubeImage = require('texture2cube');

var cubeImage = new CubeImage({
    top: 'texture_top.png',
    left: 'texture_left.png',
    rignt: 'texture_right.png',
})

cubeImage.toPng('./cube.png');
```

## API

**Constructor**
constructor accept five inputs:
- left: left texture
- right: right texture
- top: top texture
- scale: (optional)scale the output image
- info: (optional)can pass some data and get by `cubeImage.getPixels`

**Output**

- `cubeImage.toCanvas(element)`: append a canvas to element.
- `cubeImage.toCanvas()`: append a canvas to body
- `cubeImage.toPng('result.png')` output to a png file  
- `cubeImage.getPixels(callback(pixels, info))`: pixels are the ndarray type of the result image data, info is the data from constructor. 