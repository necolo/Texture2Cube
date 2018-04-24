import warp = require('ndarray-warp');
import savePixels = require('save-pixels');
import getPixels = require('get-pixels');
import ndarray = require('ndarray');
import blender = require('color-blend');
import path = require('path');
import bits = require('bit-twiddle');
import ops = require('ndarray-ops');
import spawn = require('child_process');
import fs = require('fs');

function alloc (w, h) {
    return ndarray(
        new Uint8Array(w * h * 4),
        [w, h, 4]);
}

export class CubeImage {
    private left:string;
    private right:string;
    private top:string;
    private scale:number;
    private info:any;

    public cos30 = Math.cos(Math.PI / 180 * 30);
    public sin30 = Math.sin(Math.PI / 180 * 30);
    public sin45 = Math.sin(Math.PI / 180 * 45);

    constructor(spec:{
        left:string,
        right:string,
        top:string,
        scale?:number,
        info?:any,
    }) {
        this.left = spec.left;
        this.right = spec.right;
        this.top = spec.top;
        this.scale = (spec.scale !== undefined) ? spec.scale : 1;
        this.info = (spec.info !== undefined) ? spec.info : undefined;
    }

    public toCanvas(element) {
        this._run((pixels) => {
            const canvas = savePixels(pixels, 'canvas');
            if (element) {
                element.appendChild(canvas);
            } else {
                document.body.appendChild(canvas);
            }
        });
    }

    public toPng(dst) {
        this._run((pixels) => {
            const out = fs.createWriteStream(dst);
            savePixels(pixels, 'png').pipe(out);
        });
    }

    public getPixels(next) {
        this._run((pixels) => {
            next(pixels, this.info);
        });
    }

    private _run(next) {
        getPixels(this.left, (leftErr, leftPixels) => {
            if (leftErr) {
                throw(leftErr);
            }

            getPixels(this.right, (rightErr, rightPixels) => {
                if (rightErr) {
                    throw(rightErr);
                }

                getPixels(this.top, (topErr, topPixels) => {
                    if (topErr) {
                        throw(topErr);
                    }

                    const size = leftPixels.shape[0];
                    if (size !== leftPixels.shape[1] ||
                        size !== rightPixels.shape[0] ||
                        size !== rightPixels.shape[1] ||
                        size !== topPixels.shape[0] ||
                        size !== topPixels.shape[1]) {

                        return;
                    }

                    const leftResult = this._mapLeft(leftPixels, size);
                    const rightResult = this._mapRight(rightPixels, size);
                    const topResult = this._mapTop(topPixels, size);

                    const result = this._splice(
                            topResult,
                            this._splice(
                                leftResult,
                                rightResult,
                            ));

                    next(result);
                });
            });
        });
            }

    private _splice(p1, p2) {
        const nx = p1.shape[0];
        const ny = p2.shape[1];
        const result = alloc(nx, ny);

        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                const backgrop = {
                    r: p1.get(i, j, 0),
                    g: p1.get(i, j, 1),
                    b: p1.get(i, j, 2),
                    a: p1.get(i, j, 3) / 255,
                };

                const source = {
                    r: p2.get(i, j, 0),
                    g: p2.get(i, j, 1),
                    b: p2.get(i, j, 2),
                    a: p2.get(i, j, 3) / 255,
                };

                const color = blender.screen(backgrop, source);
                result.set(i, j, 0, color.r);
                result.set(i, j, 1, color.g);
                result.set(i, j, 2, color.b);
                result.set(i, j, 3, color.a * 255);
            }
        }
        return result;
    }

    private _mapTop(pixels, size) {
        const scaledSize = size * this.scale;

        const sin45 = this.sin45;
        const cos30 = this.cos30;
        const sin30 = this.sin30;

        const r1 = alloc(2 * scaledSize, 2 * scaledSize);
        const r2 = alloc(2 * scaledSize, 2 * scaledSize);

        warp(r1, pixels, (out, inp) => {
            out[0] = Math.floor(inp[0] / this.scale);
            out[1] = Math.floor(inp[1] / this.scale);
            out[2] = inp[2];
        });

        warp(r2, r1, (out, inp) => {
            out[0] = sin45 * inp[0] - sin45 * inp[1];
            out[1] = sin45 * inp[0] + sin45 * inp[1];

            out[0] += scaledSize / 2;
            out[1] -= scaledSize / 2;
            out[2] = inp[2];
        });

        warp(r1, r2, (out, inp) => {
            out[0] = inp[0] * sin45 / cos30;
            out[1] = inp[1] * sin45 / sin30;
            out[2] = inp[2];
        });

        warp(r2, r1, (out, inp) => {
            out[0] = inp[0] - (scaledSize - scaledSize * cos30);
            out[1] = inp[1];
            out[2] = inp[2];
        });

        return r2;
    }

    private _mapLeft(pixels, size) {
        const scaledSize = size * this.scale;

        const sin45 = this.sin45;
        const cos30 = this.cos30;
        const sin30 = this.sin30;

        const r1 = alloc(2 * scaledSize, 2 * scaledSize);
        const r2 = alloc(2 * scaledSize, 2 * scaledSize);

        warp(r1, pixels, (out, inp) => {
            out[0] = Math.floor(inp[0] / this.scale);
            out[1] = Math.floor(inp[1] / this.scale);
            out[2] = inp[2];
        });

        warp(r2, r1, (out, inp) => {
            out[0] = inp[0] / cos30;
            out[1] = inp[1] - inp[0] / cos30 * sin30;
            out[2] = inp[2];
        });

        warp(r1, r2, (out, inp) => {
            out[0] = inp[0] - (scaledSize - scaledSize * cos30);
            out[1] = inp[1] - scaledSize * sin30;
            out[2] = inp[2];
        });

        return r1;
    }

    private _mapRight(pixels, size) {
        const scaledSize = size * this.scale;

        const sin45 = this.sin45;
        const cos30 = this.cos30;
        const sin30 = this.sin30;

        const r1 = alloc(2 * scaledSize, 2 * scaledSize);
        const r2 = alloc(2 * scaledSize, 2 * scaledSize);

        warp(r1, pixels, (out, inp) => {
            out[0] = Math.floor(inp[0] / this.scale);
            out[1] = Math.floor(inp[1] / this.scale);
            out[2] = inp[2];
        });

        warp(r2, r1, (out, inp) => {
            out[0] = inp[0] / cos30;
            out[1] = inp[1] + inp[0] / cos30 * sin30 - 2 * scaledSize * sin30;
            out[2] = inp[2];
        });

        warp(r1, r2, (out, inp) => {
            out[0] = inp[0] - scaledSize;
            out[1] = inp[1];
            out[2] = inp[2];
        });

        // set color darker
        for (let i = 0; i < r1.shape[0]; i++) {
            for (let j = 0; j < r1.shape[1]; j++) {
                for (let k = 0; k < 3; k ++) {
                    r1.set(i, j, k, r1.get(i, j, k) * 0.7);
                }
            }
        }

        return r1;
    }
}