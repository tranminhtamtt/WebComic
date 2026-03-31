package com.example.demo.entity;

import java.io.Serializable;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ReadingHistoryId implements Serializable {
    private Long user;
    private Long comic;
}
