def find_shortest_path(graph_adjacency, start_id, end_id):
    """
    Implements Dijkstra's Algorithm.
    Returns: (list of node_ids, total_distance)
    """
    distances = {node: float('inf') for node in graph_adjacency}
    distances[start_id] = 0
    predecessors = {node: None for node in graph_adjacency}
    
    unvisited = set(graph_adjacency.keys())

    while unvisited:
        # Priority Queue simulation: Get node with smallest distance
        min_node = None
        for node in unvisited:
            if min_node is None or distances[node] < distances[min_node]:
                min_node = node
        
        if distances[min_node] == float('inf'):
            break # No path possible
            
        if min_node == end_id:
            break
            
        unvisited.remove(min_node)
        
        # Check neighbors
        current_dist = distances[min_node]
        neighbors = graph_adjacency.get(min_node, {})
        
        for neighbor, weight in neighbors.items():
            if neighbor in unvisited: # Optimization
                new_dist = current_dist + weight
                if new_dist < distances[neighbor]:
                    distances[neighbor] = new_dist
                    predecessors[neighbor] = min_node

    # Reconstruct path
    path = []
    current = end_id
    while current is not None:
        path.append(current)
        current = predecessors[current]
    path.reverse()
    
    if not path or path[0] != start_id:
        return [], float('inf')

    return path, distances[end_id]