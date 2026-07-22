# 지원 캐릭터 확대 — 검수용 데이터 초안

> 상태: 사용자 승인 후 `3.5.1` 릴리스에 반영 완료
>
> 기준: 공개 데이터베이스의 레벨 90 기본 공격력 표기
>
> 검수 범위: 속성·무기 타입·기초 공격력·표시 역할·한국어 명칭

## 입력 원칙

- `baseAttack`은 무기·에코·공명 체인·버프를 제외한 레벨 90 캐릭터 기본 공격력이다.
- 기존 3파티와 마찬가지로 파티는 편성/표시 범위다. 파티 DPS나 모든 스킬 효과를 자동 계산하지 않는다.
- `externalKey`는 영문 소문자·하이픈만 사용한다. 파수인은 속성을 명확히 하기 위해 `rover-havoc`으로 구분한다.
- 출처는 공개 커뮤니티 데이터베이스이며, 사용자의 검토·승인을 거쳐 `2026-07-22`에 적재했다.

## 기류 파티 및 후보

| externalKey | 이름 | 표시 역할 초안 | 속성 | 무기 타입 | Lv.90 기초 공격력 | 출처 |
| --- | --- | --- | --- | --- | ---: | --- |
| `jiyan` | 기염 | 메인 딜러 | 기류 | 대검 (`broadblade`) | 437 | [Wuthering.gg — Jiyan](https://wuthering.gg/characters/jiyan) |
| `mortefi` | 모르테피 | 서브 딜러 | 용융 | 권총 (`pistol`) | 250 | [Wuthering.gg — Mortefi](https://wuthering.gg/characters/mortefi) |
| `verina` | 벨리나 | 힐러 · 서포터 · 증폭기 | 회절 | 증폭기 (`rectifier`) | 337 | [Wuthering.gg — Verina](https://wuthering.gg/characters/verina) |

## 별도 기류 파티

| externalKey | 이름 | 표시 역할 초안 | 속성 | 무기 타입 | Lv.90 기초 공격력 | 출처 |
| --- | --- | --- | --- | --- | ---: | --- |
| `iuno` | 유노 | 메인 딜러 · 권갑 | 기류 | 권갑 (`gauntlet`) | 450 | [Wuthering.gg — Iuno](https://wuthering.gg/characters/iuno) |
| `jianxin` | 감심 | 서포터 · 생존 치료 · 권갑 | 기류 | 권갑 (`gauntlet`) | 337 | [Wuthering.gg — Jianxin](https://wuthering.gg/characters/jianxin) |
| `rover-havoc` | 파수인 | 서브 딜러 · 직검 | 인멸 | 직검 (`sword`) | 412 | [Wuthering.gg — Rover (Havoc)](https://wuthering.gg/characters/rover-havoc) |

## 전도 파티

| externalKey | 이름 | 표시 역할 초안 | 속성 | 무기 타입 | Lv.90 기초 공격력 | 출처 |
| --- | --- | --- | --- | --- | ---: | --- |
| `xiangli-yao` | 상리요 | 메인 딜러 · 권갑 | 전도 | 권갑 (`gauntlet`) | 425 | [Wuthering.gg — Xiangli Yao](https://wuthering.gg/characters/xiangli-yao) |
| `yinlin` | 음림 | 서브 딜러 · 증폭기 | 전도 | 증폭기 (`rectifier`) | 400 | [Wuthering.gg — Yinlin](https://wuthering.gg/characters/yinlin) |
| `verina` | 벨리나 | 힐러 · 서포터 · 증폭기 | 회절 | 증폭기 (`rectifier`) | 337 | 기류 파티와 동일 |

## 인멸 파티 및 후보

| externalKey | 이름 | 표시 역할 초안 | 속성 | 무기 타입 | Lv.90 기초 공격력 | 출처 |
| --- | --- | --- | --- | --- | ---: | --- |
| `camellya` | 카멜리아 | 메인 딜러 · 직검 | 인멸 | 직검 (`sword`) | 450 | [Wuthering.gg — Camellya](https://wuthering.gg/characters/camellya) |
| `roccia` | 로코코 | 서브 딜러 · 권갑 | 인멸 | 권갑 (`gauntlet`) | 375 | [Wuthering.gg — Roccia](https://wuthering.gg/characters/roccia) |
| `rover-havoc` | 파수인 | 서브 딜러 · 직검 | 인멸 | 직검 (`sword`) | 412 | [Wuthering.gg — Rover (Havoc)](https://wuthering.gg/characters/rover-havoc) |
| `yangyang-xuanling` | 양양·현령 | 메인 딜러 · 직검 | 인멸 | 직검 (`sword`) | 425 | [Wuthering.gg — Yangyang: Xuanling](https://wuthering.gg/characters/yangyang-xuanling) |

## 반영 결과

1. 파수인은 표시 이름에서 속성 표기를 제거했고, 내부 키만 `rover-havoc`으로 유지한다.
2. 양양·현령은 `메인 딜러 · 직검`으로 반영했으며 지원 역할을 넣지 않았다.
3. 유노의 역할은 초기 초안의 `서브 딜러 · 지원` 대신 사용자 확인에 따라 `메인 딜러 · 권갑`으로 확정했다.
4. 이번 릴리스에는 캐릭터, 필요한 권총·권갑 무기, 세 속성의 에코 주옵션만 포함한다. 전용 무기·에코 세트·조건부 파티 버프 확장은 별도 출처 검증 후 진행한다.
