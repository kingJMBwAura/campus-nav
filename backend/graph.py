import json
import os

class CampusGraph:
    def __init__(self):
        # Load JSON data
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(base_dir, 'data', 'campus_graph.json')
        
        with open(data_path, 'r') as f:
            data = json.load(f)
            
        self.buildings = data['buildings']
        self.adjacency = data['adjacency']

    def get_all_buildings(self):
        """Returns a list of building objects."""
        # Convert dictionary to list for sorting
        building_list = [{'id': k, **v} for k, v in self.buildings.items()]
        return self.quick_sort(building_list)

    def quick_sort(self, data):
        """Sorts buildings alphabetically by name."""
        if len(data) <= 1:
            return data
        
        pivot = data[len(data) // 2]
        less = [x for x in data if x['name'] < pivot['name']]
        equal = [x for x in data if x['name'] == pivot['name']]
        greater = [x for x in data if x['name'] > pivot['name']]
        
        return self.quick_sort(less) + equal + self.quick_sort(greater)

    def get_building_by_name(self, name):
        """Finds a building ID using Binary Search on the sorted list."""
        sorted_buildings = self.get_all_buildings()
        low = 0
        high = len(sorted_buildings) - 1
        
        while low <= high:
            mid = (low + high) // 2
            mid_name = sorted_buildings[mid]['name']
            
            if mid_name == name:
                return sorted_buildings[mid]
            elif mid_name < name:
                low = mid + 1
            else:
                high = mid - 1
        return None