package com.brostech.transport.jpa.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Entity
@Table(name = "trip_status_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TripStatusHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 50)
    private Trip.TripStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 50)
    private Trip.TripStatus toStatus;

    @Column(name = "action_at", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date actionAt;

    @Column(name = "action_by", length = 50)
    private String actionBy;

    @Column(name = "action_by_name", length = 255)
    private String actionByName;

    @Column(name = "note", length = 1000)
    private String note;
}
