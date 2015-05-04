GPX as JSON Format

```
{
    'trackId' : {
        'version' : '1.0',
        'creator' : 'Creator (person/application/service) of this file/json',
        'metadata' : {
            'name' : 'Track Name',
            'desc' : 'Description for the track',
            'author' : 'The person or organization who created the track',
            'email': 'Email address of creator/author',
            'copyright' : 'Copyright and license information',
            'time' : 'The creation date of the file/json',
            'timeFormat' : 'YYYYMMDD HH:MM, etc.',
            'keywords' : 'keywords/tags',
            'bounds' : {
                // Minimum and maximum coordinates which describe
                // the extent of the coordinates in the track.
                'minLat' : 'top-left-lat',
                'minLng' : 'top-left-lng',
                'maxLat' : 'bottom-right-lat',
                'maxLng' : 'bottom-right-lng'
            },
            'link' : 'URL to this file/json'
        },
        'waypoints' : [
            {
                'type' : 'Type (classification) of the waypoint - Hospital, ATM, etc.'
                'name' : 'Waypoint name',
                'desc' : 'Waypoint description',
                'cmt' : ['Comment for this waypoint', ...],
                'icon' : 'Icon URL',
                'coords' : {
                    'lat' : 'Latitude',
                    'lng' : 'Longitude',
                    'ele' : 'Elevation (in meters) of the point',
                    'time' : 'The creation date of the waypoint',
                    'timeFormat' : 'YYYYMMDD HH:MM, etc.'
                }
            },
            {...}
        ],
        // A Track Segment holds a list of Track Points which are logically connected in order.
        // To represent a single GPS track where GPS reception was lost, or the GPS
        // receiver was turned off, start a new Track Segment for each continuous span of track data.
        'segments': [
            [
                {
                    'lat' : 'Latitude',
                    'lng' : 'Longitude',
                    'ele' : 'Elevation (in meters) of the point',
                    // Date and time are in Univeral Coordinated Time (UTC), not local
                    // time! Conforms to ISO 8601 specification for date/time representation.
                    // Fractional seconds are allowed for millisecond timing.
                    'time' : 'Timestamp (ISO 8601)'
                    // 'timeFormat' is skipped for storage optimization
                },
                {...}
            ],
            [...]
        ]
    },
    '...' : {...}
}
```
