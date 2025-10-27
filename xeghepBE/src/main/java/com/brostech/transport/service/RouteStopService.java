package com.brostech.transport.service;

import com.brostech.transport.dto.routestop.RouteStopDTO;
import com.brostech.transport.dto.routestop.RouteStopRequest;

import java.util.List;

public interface RouteStopService {
    RouteStopDTO addStop(RouteStopRequest req);
    List<RouteStopDTO> listByRoute(Long routeId);
    RouteStopDTO reorder(Long routeStopId, Integer newOrder);
    void remove(Long routeStopId);
}
