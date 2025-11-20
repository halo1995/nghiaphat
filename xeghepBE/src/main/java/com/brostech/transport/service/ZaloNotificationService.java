package com.brostech.transport.service;

import com.brostech.transport.jpa.entity.Trip;
import com.brostech.transport.jpa.entity.User;
import com.brostech.transport.jpa.entity.Vehicle;

public interface ZaloNotificationService {
    /**
     * Send trip confirmation notification to customer via Zalo ZNS
     * @param trip The trip details
     * @param driver The assigned driver
     * @param vehicle The vehicle for the trip
     * @return true if message sent successfully, false otherwise
     */
    boolean sendTripConfirmation(Trip trip, User driver, Vehicle vehicle);
}
