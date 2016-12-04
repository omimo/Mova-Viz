import * as BVHParser from './BVHReader.js';

interface MapArray {
  [index: string]: any;
}

let Parsers = {} as MapArray;

Parsers['bvh'] = BVHParser;

export default Parsers;