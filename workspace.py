import gpxpy

map_gpx = open('tracks/BoyanskiVodopad201505011156_back.gpx', 'r')
# Има проблем с парсването на кирилица
#map_gpx = open('tracks/BoyanskiVodopad201505011156_go.gpx', 'r')

p = gpxpy.parse(map_gpx)

print(p)
#print(p.tracks[0].name.strip())
print(p.tracks[0].segments)
# print(p.tracks[0].segments[0].points)

prev_point = None

distance_2d = 0.0
distance_3d = 0.0

for segment in p.tracks[0].segments:
    for point in segment.points:
        # GPXTrackPoint(42.706898, 23.289153, elevation=564.4, time=datetime.datetime(2015, 5, 1, 16, 0, 25, 998000), horizontal_dilution=0, vertical_dilution=0, position_dilution=0, speed=0)
        # ['adjust_time', 'comment', 'distance_2d', 'distance_3d', 'elevation', 'elevation_angle', 'has_elevation', 
        #  'horizontal_dilution', 'latitude', 'longitude', 'move', 'name', 'position_dilution', 'remove_elevation', 
        #  'remove_time', 'speed', 'speed_between', 'symbol', 'time', 'time_difference', 'to_xml', 'vertical_dilution']

        ### Calc distnace ###
        if not prev_point:
            prev_point = point
        distance_2d += point.distance_2d(prev_point)
        distance_3d += point.distance_3d(prev_point)
        prev_point = point
        #####################



print("Total distance (3d) %s m" % distance_3d)
print("Total distance (3d) %s km" % (distance_3d / 1000.0))

print("Total distance (2d) %s m" % distance_2d)
print("Total distance (2d) %s km" % (distance_2d / 1000.0))


############### FROM gpxpy/gpxinfo.py #####################

import math as mod_math
def format_time(time_s):
    if not time_s:
        return 'n/a'
    minutes = mod_math.floor(time_s / 60.)
    hours = mod_math.floor(minutes / 60.)

    return '%s:%s:%s' % (str(int(hours)).zfill(2), str(int(minutes % 60)).zfill(2), str(int(time_s % 60)).zfill(2))

indentation = ' '
gpx_part = p.tracks[0].segments[0]

length_2d = gpx_part.length_2d()
length_3d = gpx_part.length_3d()
print('{}Length 2D: {:.3f}km'.format(indentation, length_2d / 1000.))
print('{}Length 3D: {:.3f}km'.format(indentation, length_3d / 1000.))

moving_time, stopped_time, moving_distance, stopped_distance, max_speed = gpx_part.get_moving_data()
print('%sMoving time: %s' % (indentation, format_time(moving_time)))
print('%sStopped time: %s' % (indentation, format_time(stopped_time)))
print('{}Max speed: {:.2f}m/s = {:.2f}km/h'.format(indentation, max_speed if max_speed else 0, max_speed * 60. ** 2 / 1000. if max_speed else 0))


uphill, downhill = gpx_part.get_uphill_downhill()
print('{}Total uphill: {:.2f}m'.format(indentation, uphill))
print('{}Total downhill: {:.2f}m'.format(indentation, downhill))

start_time, end_time = gpx_part.get_time_bounds()
print('%sStarted: %s' % (indentation, start_time))
print('%sEnded: %s' % (indentation, end_time))

points_no = len(list(gpx_part.walk(only_points=True)))
print('%sPoints: %s' % (indentation, points_no))

distances = []
max_elevation = 0.0
min_elevation = None
previous_point = None
for point in gpx_part.walk(only_points=True):
    if previous_point:
        distance = point.distance_2d(previous_point)
        distances.append(distance)
    previous_point = point

    if not min_elevation:
        min_elevation = point.elevation
    max_elevation = max(max_elevation, point.elevation)
    min_elevation = min(min_elevation, point.elevation)
print('{}Avg distance between points: {:.2f}m'.format(indentation, sum(distances) / len(list(gpx_part.walk()))))

print('{}Max elevation: {:.0f}m'.format(indentation, max_elevation))
print('{}Min elevation: {:.0f}m'.format(indentation, min_elevation))

print('')