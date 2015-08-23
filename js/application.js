(function(tracker, $, undefined) {
  tracker.app = tracker.app || {};

  tracker.app.Main = function(options) {
    this.DEBUG = true;

    if(this.hasSupportForFileAPI()){
      this.supportFileAPI = true;
    } else {
      this.supportFileAPI = false;
      alert('The File APIs are not fully supported in this browser.');
    }
  };

  tracker.app.Main.prototype._supportFeature = function(apiFeature){ 
    return apiFeature ? '\u2714' : '\u2717'
  };

  tracker.app.Main.prototype.hasSupportForFileAPI = function(){
    if(this.DEBUG){
      console.log('---------------- debug ----------------');
      console.log('Supported features:');
      console.log('  html5.File ' + this._supportFeature(window.File));
      console.log('  html5.FileReader ' + this._supportFeature(window.FileReader));
      console.log('  html5.FileList ' + this._supportFeature(window.FileList));
      console.log('  html5.Blob ' + this._supportFeature(window.Blob));
      console.log('---------------- debug ----------------');
    }

    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob) {
      // Great success! All the File APIs are supported.
      return true;
    } else {
      return false;
    }
  };

  tracker.app.Main.prototype.run = function(){
    var that = this;
    document.querySelector('.parse_files').addEventListener('click', function(evt) {
      if (evt.target.tagName.toLowerCase() == 'button') {
        that._readFile();
      }
    }, false);
  };

  tracker.app.Main.prototype.guid = function() {
    var timeit = new Date().getTime();
    
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }

    guid = s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();

    timeit += new Date().getTime();

    return guid + '-' + timeit
  };

  tracker.app.Main.prototype._readFile = function() {
    var that = this;
    var files = document.getElementById('files').files;
    
    if (!files.length) {
      alert('Please select a file!');
      return;
    }

    var file = files[0];
    var start = 0;
    var stop = file.size - 1;
    var reader = new FileReader();

    // If we use onloadend, we need to check the readyState.
    reader.onloadend = function(evt) {
      if (evt.target.readyState == FileReader.DONE) { // DONE == 2
        //document.getElementById('byte_content').innerHTML = evt.target.result;
        document.getElementById('byte_range').textContent = 
          ['Read bytes: ', start + 1, ' - ', stop + 1, ' of ', file.size, ' byte file'].join('');
        // TODO
        // File is read and have to be parsed

        var start = new Date().getTime();
        that._xmlToJson(evt.target.result);
        var end = new Date().getTime();

        if(that.DEBUG){
          console.log('XmlToJson | Execution time: ' + ((end - start) / 1000.0).toFixed(3) + 'sec');
        }
      }
    };

    var blob = file.slice(start, stop + 1);
    reader.readAsBinaryString(blob);
  };

  tracker.app.Main.prototype._xmlToJson =function(xml) {
    var that = this;
    try {
      
      var xmlDoc = $.parseXML(xml);
      var xml = $(xmlDoc);
      
      console.log('------------- parse -------------');

      var dump = {};

      // GPX info
      dump.fileId = this.guid();
      dump.gpxTag = xml.find('gpx').first();
      dump.gpxVersion = dump.gpxTag.attr('version') || '0'
      if(dump.gpxVersion !== '1.1'){
        // TODO unsopported version
        alert('unsuported gpx version');
        return;
      }
      dump.creator = dump.gpxTag.attr('creator') || '';

      // Metadata
      dump.metadataTag = xml.find('metadata').first();
      dump.metadata = {}
      dump.metadata.name = dump.metadataTag.find('name').first().text() || '';
      dump.metadata.desc = dump.metadataTag.find('desc').first().text() || '';
      dump.metadata.author = dump.metadataTag.find('author').first().find('name').text() || '';
      dump.metadata.email = dump.metadataTag.find('author').first().find('email').text() || '';
      dump.metadata.copyright = (dump.metadataTag.find('copyright').first().attr('author') || '') + 
        ' | ' +
        (dump.metadataTag.find('copyright').first().find('year').first().text() || '') +
        ' | ' +
        (dump.metadataTag.find('copyright').first().find('license').first().text() || '');

      if(dump.metadata.copyright === ' |  | ') {
        dump.metadata.copyright = '';
      }
      dump.metadata.time = dump.metadataTag.find('time').first().text() || '';
      dump.metadata.timeFormat = 'ISO8601';
      dump.metadata.keywords = dump.metadataTag.find('keywords').first().text() || '';
      dump.metadata.bounds = {
        minLat: dump.metadataTag.find('bounds').first().attr('minlat') || -1,
        minLng: dump.metadataTag.find('bounds').first().attr('minlon') || -1,
        maxLat: dump.metadataTag.find('bounds').first().attr('maxlat') || -1,
        maxLng: dump.metadataTag.find('bounds').first().attr('maxlon') || -1
      }
      dump.metadata.link = "http://mysite.com/file/" + dump.fileId;

      // Waypoints
      dump.waypoints = [];
      xml.find('wpt').each(function(){
        var wptTag = $(this);
        dump.waypoints.push({
          type: wptTag.find('type').first().text() || '',
          name: wptTag.find('name').first().text() || '',
          desc: wptTag.find('desc').first().text() || '',
          cmt: wptTag.find('cmt').first().text() || '',
          icon: wptTag.find('link').first().attr('href') || '',
          coords: {
            lat: wptTag.attr('lat') || '',
            lng: wptTag.attr('lon') || '',
            ele: wptTag.find('ele').first().text() || '',
            time: wptTag.find('time').first().text() || '',
            timeFormat: 'ISO8601'
          }
        });
      });

      // Tracks
      dump.tracks = [];
      xml.find('trk').each(function(){
        var trkTag = $(this);
        var segments = [];

        trkTag.find('trkseg').each(function(){
          var segmentTag = $(this);
          var trkPoints = [];

          segmentTag.find('trkpt').each(function(){
            var pointTag = $(this);
            
            trkPoints.push({
              lat: pointTag.attr('lat') || -1,
              lng: pointTag.attr('lon') || -1,
              ele: pointTag.find('ele').first().text() || -1,
              time: pointTag.find('time').first().text() || ''
            });
          });
          
          segments.push(trkPoints);
        });

        dump.tracks.push({
          trackId: that.guid(),
          name: trkTag.find('name').first().text() || '',
          desc: trkTag.find('desc').first().text() || '',
          cmt: trkTag.find('cmt').first().text() || '',
          type: trkTag.find('type').first().text() || '',
          segments: segments
        });
      });
      
      console.log(dump);
      console.log('------------- parse -------------');
    } catch(err) {
      alert('Invalid file structure');
      console.log(err);
    }
  };

}(window.jsTracker = window.jsTracker || {}, jQuery));

jQuery(function(){
  var application = new jsTracker.app.Main({
  });

  application.run();
});