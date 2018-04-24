"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var warp = require("ndarray-warp");
var savePixels = require("save-pixels");
var getPixels = require("get-pixels");
var ndarray = require("ndarray");
var blender = require("color-blend");
var fs = require("fs");
function alloc(w, h) {
    return ndarray(new Uint8Array(w * h * 4), [w, h, 4]);
}
var CubeImage = (function () {
    function CubeImage(spec) {
        this.cos30 = Math.cos(Math.PI / 180 * 30);
        this.sin30 = Math.sin(Math.PI / 180 * 30);
        this.sin45 = Math.sin(Math.PI / 180 * 45);
        this.left = spec.left;
        this.right = spec.right;
        this.top = spec.top;
        this.scale = (spec.scale !== undefined) ? spec.scale : 1;
        this.info = (spec.info !== undefined) ? spec.info : undefined;
    }
    CubeImage.prototype.toCanvas = function (element) {
        this._run(function (pixels) {
            var canvas = savePixels(pixels, 'canvas');
            if (element) {
                element.appendChild(canvas);
            }
            else {
                document.body.appendChild(canvas);
            }
        });
    };
    CubeImage.prototype.toPng = function (dst) {
        this._run(function (pixels) {
            var out = fs.createWriteStream(dst);
            savePixels(pixels, 'png').pipe(out);
        });
    };
    CubeImage.prototype.getPixels = function (next) {
        var _this = this;
        this._run(function (pixels) {
            next(pixels, _this.info);
        });
    };
    CubeImage.prototype._run = function (next) {
        var _this = this;
        getPixels(this.left, function (leftErr, leftPixels) {
            if (leftErr) {
                throw (leftErr);
            }
            getPixels(_this.right, function (rightErr, rightPixels) {
                if (rightErr) {
                    throw (rightErr);
                }
                getPixels(_this.top, function (topErr, topPixels) {
                    if (topErr) {
                        throw (topErr);
                    }
                    var size = leftPixels.shape[0];
                    if (size !== leftPixels.shape[1] ||
                        size !== rightPixels.shape[0] ||
                        size !== rightPixels.shape[1] ||
                        size !== topPixels.shape[0] ||
                        size !== topPixels.shape[1]) {
                        return;
                    }
                    var leftResult = _this._mapLeft(leftPixels, size);
                    var rightResult = _this._mapRight(rightPixels, size);
                    var topResult = _this._mapTop(topPixels, size);
                    var result = _this._splice(topResult, _this._splice(leftResult, rightResult));
                    next(result);
                });
            });
        });
    };
    CubeImage.prototype._splice = function (p1, p2) {
        var nx = p1.shape[0];
        var ny = p2.shape[1];
        var result = alloc(nx, ny);
        for (var i = 0; i < nx; i++) {
            for (var j = 0; j < ny; j++) {
                var backgrop = {
                    r: p1.get(i, j, 0),
                    g: p1.get(i, j, 1),
                    b: p1.get(i, j, 2),
                    a: p1.get(i, j, 3) / 255,
                };
                var source = {
                    r: p2.get(i, j, 0),
                    g: p2.get(i, j, 1),
                    b: p2.get(i, j, 2),
                    a: p2.get(i, j, 3) / 255,
                };
                var color = blender.screen(backgrop, source);
                result.set(i, j, 0, color.r);
                result.set(i, j, 1, color.g);
                result.set(i, j, 2, color.b);
                result.set(i, j, 3, color.a * 255);
            }
        }
        return result;
    };
    CubeImage.prototype._mapTop = function (pixels, size) {
        var _this = this;
        var scaledSize = size * this.scale;
        var sin45 = this.sin45;
        var cos30 = this.cos30;
        var sin30 = this.sin30;
        var r1 = alloc(2 * scaledSize, 2 * scaledSize);
        var r2 = alloc(2 * scaledSize, 2 * scaledSize);
        warp(r1, pixels, function (out, inp) {
            out[0] = Math.floor(inp[0] / _this.scale);
            out[1] = Math.floor(inp[1] / _this.scale);
            out[2] = inp[2];
        });
        warp(r2, r1, function (out, inp) {
            out[0] = sin45 * inp[0] - sin45 * inp[1];
            out[1] = sin45 * inp[0] + sin45 * inp[1];
            out[0] += scaledSize / 2;
            out[1] -= scaledSize / 2;
            out[2] = inp[2];
        });
        warp(r1, r2, function (out, inp) {
            out[0] = inp[0] * sin45 / cos30;
            out[1] = inp[1] * sin45 / sin30;
            out[2] = inp[2];
        });
        warp(r2, r1, function (out, inp) {
            out[0] = inp[0] - (scaledSize - scaledSize * cos30);
            out[1] = inp[1];
            out[2] = inp[2];
        });
        return r2;
    };
    CubeImage.prototype._mapLeft = function (pixels, size) {
        var _this = this;
        var scaledSize = size * this.scale;
        var sin45 = this.sin45;
        var cos30 = this.cos30;
        var sin30 = this.sin30;
        var r1 = alloc(2 * scaledSize, 2 * scaledSize);
        var r2 = alloc(2 * scaledSize, 2 * scaledSize);
        warp(r1, pixels, function (out, inp) {
            out[0] = Math.floor(inp[0] / _this.scale);
            out[1] = Math.floor(inp[1] / _this.scale);
            out[2] = inp[2];
        });
        warp(r2, r1, function (out, inp) {
            out[0] = inp[0] / cos30;
            out[1] = inp[1] - inp[0] / cos30 * sin30;
            out[2] = inp[2];
        });
        warp(r1, r2, function (out, inp) {
            out[0] = inp[0] - (scaledSize - scaledSize * cos30);
            out[1] = inp[1] - scaledSize * sin30;
            out[2] = inp[2];
        });
        return r1;
    };
    CubeImage.prototype._mapRight = function (pixels, size) {
        var _this = this;
        var scaledSize = size * this.scale;
        var sin45 = this.sin45;
        var cos30 = this.cos30;
        var sin30 = this.sin30;
        var r1 = alloc(2 * scaledSize, 2 * scaledSize);
        var r2 = alloc(2 * scaledSize, 2 * scaledSize);
        warp(r1, pixels, function (out, inp) {
            out[0] = Math.floor(inp[0] / _this.scale);
            out[1] = Math.floor(inp[1] / _this.scale);
            out[2] = inp[2];
        });
        warp(r2, r1, function (out, inp) {
            out[0] = inp[0] / cos30;
            out[1] = inp[1] + inp[0] / cos30 * sin30 - 2 * scaledSize * sin30;
            out[2] = inp[2];
        });
        warp(r1, r2, function (out, inp) {
            out[0] = inp[0] - scaledSize;
            out[1] = inp[1];
            out[2] = inp[2];
        });
        for (var i = 0; i < r1.shape[0]; i++) {
            for (var j = 0; j < r1.shape[1]; j++) {
                for (var k = 0; k < 3; k++) {
                    r1.set(i, j, k, r1.get(i, j, k) * 0.7);
                }
            }
        }
        return r1;
    };
    return CubeImage;
}());
exports.CubeImage = CubeImage;
