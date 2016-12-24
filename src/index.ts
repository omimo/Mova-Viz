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

        if (dm.frames === undefined) {
            console.log('111');
            data = self.tracks[self.tracks.length-1].data.getPositionsArray().filter(function(d: number, i:number){
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
            data = self.tracks[self.tracks.length-1].data.getPositionsArray()[dm.frames[0]];
            // console.log(jointData);
            selector = self.svgContainer.selectAll("g.dataframe")
            .data(data)
            .enter();

            dm.fn(selector);
        } else if (dm.frames.length == 2) {
            console.log('333');
            data = self.tracks[self.tracks.length-1].data.getPositionsArray().filter(function(d: number, i:number){
                return i>=dm.frames[0] && i<dm.frames[2] && (i % dm.frameSkip == 0);
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
        } else {
            self.err('Invalid frame range!');
        }
        
        // console.log('eeeee');
        // console.log(jointData);
        

        dm.drawn = true;

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