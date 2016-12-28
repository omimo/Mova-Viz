import Parsers from './parsers/Parsers';

export interface IDataModality {
    [key: string]: Array<number>;
}

export interface ITrack {
    url: string,
    parserObject: any,
    format: string,
    data: IDataModality,
    // {
    //     'joint-positions': [0],
    //     'joint-rotations': [0],
    //     'bone-positions': [0]
    // },
    isMocap: boolean         
}

export default class MovaViz {
    title: string;
    tracks: any[];
    svgContainer: any;
    _debug: boolean;
    _debugErr: boolean;
    _dataReady: boolean;    
    _drawMethods: any[];
    _updateMethods: any[];
    
    /**
     * The constructor
     * 
     * @param  {string} title
     */
    constructor(title: string) {
        if (!(this instanceof MovaViz)) return new MovaViz(title);
        this.title = title;
        this.tracks = [];      
        this._debug = true;
        this._debugErr = true;    
        this._dataReady = false;
        this._drawMethods = [];
        this._updateMethods = [];
    }
    
    /**
     * Load the data into the object
     * 
     * @param  {string} url
     * @param  {string} format the format of the data, currently only supports 'bvh'
     * @param  {any} callbackFn an optional function to be called once the data is loaded
     */
    data(url: string, format: string, callbackFn: any) {
        let self = this;                
        this.log("Loading the track ...");

         let track: ITrack;

        // The Parsers[format] will call the proper function         
        let parser: any = new Parsers[format]();
        parser.load(url, function(data: any) {
            // Create the Track object
            track = {
                url: url,
                parserObject: data,
                format: format,
                data: [],
                isMocap: format in {'bvh':1,'c3d':1}? true : false             
            }; 
                        
            track.data['joint-positions'] = track.parserObject.getPositionsArray();
            track.data['joint-rotations'] = track.parserObject.frameArray;
            let skeleton = track.parserObject.connectivityMatrix;            

            track.data['bone-positions'] = track.data['joint-positions'].map(function (d:any, i:number) {
                return skeleton.map(function(b:any,j:number) {                    
                    return {
                        x1:d[b[0].jointIndex].x,
                        y1:d[b[0].jointIndex].y,
                        x2:d[b[1].jointIndex].x,
                        y2:d[b[1].jointIndex].y,
                    }
                });
            });

            self.tracks.push(track);

            self.log("Done!");
            self._dataReady = true;            

            for (let dm of self._drawMethods) {
                if (!dm.drawn)
                self.callDrawFn(dm);
            }     

            if (callbackFn)
                callbackFn();
         });

         

        return this;
    }

    addDrawMethod(drawFn: any, dataType: string, frames: number[], frameSkip: number) {
        if (frameSkip === undefined)
            frameSkip = 1;

        let dm = {
            fn: drawFn,
            drawn: false,
            dataType: dataType,
            frames: frames,
            frameSkip: frameSkip
        };

        if (this._dataReady) {
            this.callDrawFn(dm);            
        }

        this._drawMethods.push(dm);

        return this;
    }


    /**
     * Set the SVG container
     * 
     * @param  {string} cont
     */
    container(cont: string) {
        this.svgContainer = cont;
        return this;
    }

    callDrawFn(dm: any) {
        let self = this;        

        if (!self._dataReady) {
            self.err('Data is not ready for drawing!');
            return self;
        }
        
        let selector = {};
        let data = self.tracks[self.tracks.length-1].data[dm.dataType];
    
        if (data === undefined){
            self.err('Invalid data config!');
            return self;
        }

        if (dm.frames === undefined) {            
            data = data.filter(function(d: number, i:number){
                return i % dm.frameSkip == 0;
            });

            selector = self.svgContainer.selectAll("g.dataframe")
            .data(data)
            .enter()
            .append('g').attr('calss','dataframe')
            .selectAll('d')
            .data(function (d: any) {
                return d;
            });

            dm.fn(selector);            
        } else if (dm.frames.length == 1) {            
            data = data[dm.frames[0]];            
            selector = self.svgContainer.append('g')
            .attr('class', 'g-'+dm.dataType)
            .selectAll('.'+dm.dataType)
            .data(data)
            .enter();

            dm.fn(selector);
        } else if (dm.frames.length == 2) {        
            data = data.filter(function(d: number, i:number){                
                return i>=dm.frames[0] && i<dm.frames[1] && (i % dm.frameSkip == 0);
            });    
            selector = self.svgContainer.append('g')
            .attr('class', 'g-'+dm.dataType)
            .selectAll('.'+dm.dataType)
            .data(data)
            .enter();

            dm.fn(selector);
        } else {
            self.err('Invalid frame range!');
        }
        
        // console.log('eeeee');
        // console.log(jointData);
        

        dm.drawn = true;

        return this;
    }

    updateDraw(drawFn: any, dataType: string, frames: number[], frameSkip: number) {
        let self = this;  

        if (frameSkip === undefined)
            frameSkip = 1;

        if (!self._dataReady) {
            self.err('Data is not ready for drawing!');
            return self;
        }
        
        let selector = {};
        let data = self.tracks[self.tracks.length-1].data[dataType];

        if (data === undefined){
            self.err('Invalid data config!');
            return self;
        }

        // Extract the desired subset
        if (frames === undefined || frames == [-1]) {            
            data = data.filter(function(d: number, i:number){
                return i % frameSkip == 0;
            });

            selector = self.svgContainer.selectAll("g.dataframe")
            .data(data)            
            .append('g').attr('calss','dataframe')
            .selectAll('d')
            .data(function (d: any) {
                return d;
            });

            drawFn(selector);            
        } else if (frames.length == 1) {            
            data = data[frames[0]];            
            selector = self.svgContainer.selectAll('g.g-'+dataType)
            .selectAll('.'+dataType)
            .data(data);            
            
            drawFn(selector);
        } else if (frames.length == 2) {            
            data = data.filter(function(d: number, i:number){                                
                return i>=frames[0] && i<frames[1] && (i % frameSkip == 0);
            });    
            selector = self.svgContainer.selectAll('g.g-'+dataType)
            .selectAll('.'+dataType)
            .data(data);
            
            drawFn(selector);
        } else {
            self.err('Invalid frame range!');
        }

        return this;
    }

    debug(d: boolean) {
        this._debug = d;

        return this;
    }

    debugErrors(d: boolean) {
        this._debugErr = d;

        return this;
    }

    log(m: string) {
        if (this._debug)
            console.log(this.title + ": " + m.toString());
    }

    err(m: String) {
        if (this._debugErr)
            console.log("ERROR - "+ this.title + ": " + m.toString());
    }
}