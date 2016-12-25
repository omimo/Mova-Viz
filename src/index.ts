import Parsers from './parsers/Parsers';

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
    // Create the Track object
         let track = {
             url: url,
             data: 0,
             format: format,
             isMocap: false             
         };    

         if (format in {'bvh':1,'c3d':1}) 
            track.isMocap = true;

         this.log("Loading the track ...");

         // The Parsers[format] will call the proper function         
         let parser: any = new Parsers[format]();
         parser.load(url, function(data: any) {
             track.data = data;             
             self.log("Done!");
             self._dataReady = true;            

             for (let dm of self._drawMethods) {
                 if (!dm.drawn)
                    self.callDrawFn(dm);
             }     

             if (callbackFn)
                callbackFn();
         });

         this.tracks.push(track);

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
        
        let data = new Array;
        let selector = {};

        if (dm.dataType == 'joint-positions') 
            data = self.tracks[self.tracks.length-1].data.getPositionsArray();
        else if (dm.dataType == 'joint-rotations') 
            data = self.tracks[self.tracks.length-1].data.frameArray;
        else if (dm.dataType == 'bone-positions') {
            let skeleton = self.tracks[self.tracks.length-1].data.connectivityMatrix;            
            data = self.tracks[self.tracks.length-1].data.getPositionsArray();
            data = data.map(function (d:any, i:number) {
                return skeleton.map(function(b:any,j:number) {
                    // console.log(b);
                    return {
                        x1:d[b[0].jointIndex].x,
                        y1:d[b[0].jointIndex].y,
                        x2:d[b[1].jointIndex].x,
                        y2:d[b[1].jointIndex].y,
                    }
                });
            });
            // console.log(data);
        }
        else {
            self.err('Invalid data config!');
            return self;
        }

        if (dm.frames === undefined) {
            console.log('111');
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
            console.log('222');
            data = data[dm.frames[0]];            
            selector = self.svgContainer
            .append('g')
            .attr('class', 'g-'+dm.dataType)
            .selectAll('.'+dm.dataType)
            .data(data)
            .enter();

            dm.fn(selector);
        } else if (dm.frames.length == 2) {
            console.log('333');
            data = data.filter(function(d: number, i:number){                
                return i>=dm.frames[0] && i<dm.frames[1] && (i % dm.frameSkip == 0);
            });    
            selector = self.svgContainer.selectAll("g.dataframe")
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
        
        let data = new Array;
        let selector = {};

        // Extract the proper data set
        if (dataType == 'joint-positions') 
            data = self.tracks[self.tracks.length-1].data.getPositionsArray();
        else if (dataType == 'joint-rotations') 
            data = self.tracks[self.tracks.length-1].data.frameArray;
        else if (dataType == 'bone-positions') {
            let skeleton = self.tracks[self.tracks.length-1].data.connectivityMatrix;            
            data = self.tracks[self.tracks.length-1].data.getPositionsArray();
            data = data.map(function (d:any, i:number) {
                return skeleton.map(function(b:any,j:number) {
                    // console.log(b);
                    return {
                        x1:d[b[0].jointIndex].x,
                        y1:d[b[0].jointIndex].y,
                        x2:d[b[1].jointIndex].x,
                        y2:d[b[1].jointIndex].y,
                    }
                });
            });
            // console.log(data);
        }
        else {
            self.err('Invalid data config!');
            return self;
        }

        // Extract the desired subset
        if (frames === undefined) {            
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
            selector = self.svgContainer.selectAll("g.dataframe")
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