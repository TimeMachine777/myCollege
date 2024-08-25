--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3
-- Dumped by pg_dump version 16.3

-- Started on 2024-08-25 07:37:07

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 217 (class 1259 OID 16571)
-- Name: academics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.academics (
    uid integer NOT NULL,
    cid character varying(10) NOT NULL,
    sem integer NOT NULL,
    course_name character varying(50) NOT NULL,
    professor character varying(100),
    dept character varying(20),
    credits numeric(4,1) NOT NULL,
    present integer DEFAULT 0 NOT NULL,
    total_classes integer DEFAULT 0 NOT NULL,
    quiz1 real,
    mid_sem real,
    quiz2 real,
    end_sem real,
    internal real,
    total_marks real DEFAULT 0 NOT NULL,
    CONSTRAINT chk_attendance CHECK (((present >= 0) AND (total_classes >= 0))),
    CONSTRAINT chk_cid CHECK (((cid)::text ~ '^[a-zA-Z0-9_-]+$'::text))
);


ALTER TABLE public.academics OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16667)
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    aid bigint NOT NULL,
    uid integer NOT NULL,
    cid character varying(10) NOT NULL,
    course_date timestamp with time zone NOT NULL,
    status character(1) NOT NULL,
    CONSTRAINT attendance_status_chk CHECK ((status = ANY (ARRAY['A'::bpchar, 'P'::bpchar])))
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16666)
-- Name: attendance_aid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_aid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_aid_seq OWNER TO postgres;

--
-- TOC entry 4882 (class 0 OID 0)
-- Dependencies: 220
-- Name: attendance_aid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_aid_seq OWNED BY public.attendance.aid;


--
-- TOC entry 219 (class 1259 OID 16608)
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    eid integer NOT NULL,
    uid integer NOT NULL,
    type character varying(30) DEFAULT 'other'::character varying NOT NULL,
    sem integer NOT NULL,
    event_name character varying(200) NOT NULL,
    description text,
    cid character varying(10),
    issue_date timestamp with time zone NOT NULL,
    deadline timestamp with time zone NOT NULL,
    completion_date timestamp with time zone,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    CONSTRAINT chk_date_events CHECK (((deadline > issue_date) AND (completion_date > issue_date))),
    CONSTRAINT chk_status_events CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT chk_type_events CHECK (((type)::text = ANY ((ARRAY['exam'::character varying, 'assignment'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.events OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16607)
-- Name: events_eid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.events_eid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_eid_seq OWNER TO postgres;

--
-- TOC entry 4883 (class 0 OID 0)
-- Dependencies: 218
-- Name: events_eid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.events_eid_seq OWNED BY public.events.eid;


--
-- TOC entry 216 (class 1259 OID 16558)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    uid integer NOT NULL,
    username character varying(100) NOT NULL,
    password text NOT NULL,
    name character varying(100) NOT NULL,
    roll_no character varying(20) NOT NULL,
    college character varying(50),
    current_sem integer NOT NULL,
    CONSTRAINT chk_password_length CHECK ((char_length(password) >= 8))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 16557)
-- Name: users_uid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_uid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_uid_seq OWNER TO postgres;

--
-- TOC entry 4884 (class 0 OID 0)
-- Dependencies: 215
-- Name: users_uid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_uid_seq OWNED BY public.users.uid;


--
-- TOC entry 4709 (class 2604 OID 16670)
-- Name: attendance aid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN aid SET DEFAULT nextval('public.attendance_aid_seq'::regclass);


--
-- TOC entry 4706 (class 2604 OID 16611)
-- Name: events eid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events ALTER COLUMN eid SET DEFAULT nextval('public.events_eid_seq'::regclass);


--
-- TOC entry 4702 (class 2604 OID 16561)
-- Name: users uid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN uid SET DEFAULT nextval('public.users_uid_seq'::regclass);


--
-- TOC entry 4722 (class 2606 OID 16577)
-- Name: academics academics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academics
    ADD CONSTRAINT academics_pkey PRIMARY KEY (uid, cid);


--
-- TOC entry 4728 (class 2606 OID 16673)
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (aid);


--
-- TOC entry 4725 (class 2606 OID 16619)
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (eid);


--
-- TOC entry 4718 (class 2606 OID 16563)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (uid);


--
-- TOC entry 4720 (class 2606 OID 16637)
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- TOC entry 4729 (class 1259 OID 16679)
-- Name: idx_uid_cid_attendance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_uid_cid_attendance ON public.attendance USING btree (uid, cid);


--
-- TOC entry 4723 (class 1259 OID 16585)
-- Name: idx_uid_sem_academics; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_uid_sem_academics ON public.academics USING btree (uid, sem);


--
-- TOC entry 4726 (class 1259 OID 16630)
-- Name: idx_uid_sem_events; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_uid_sem_events ON public.events USING btree (uid, sem);


--
-- TOC entry 4730 (class 2606 OID 16578)
-- Name: academics academics_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academics
    ADD CONSTRAINT academics_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;


--
-- TOC entry 4733 (class 2606 OID 16674)
-- Name: attendance attendance_uid_cid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_uid_cid_fkey FOREIGN KEY (uid, cid) REFERENCES public.academics(uid, cid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4731 (class 2606 OID 16651)
-- Name: events events_uid_cid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_uid_cid_fkey FOREIGN KEY (uid, cid) REFERENCES public.academics(uid, cid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4732 (class 2606 OID 16620)
-- Name: events events_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;


-- Completed on 2024-08-25 07:37:08

--
-- PostgreSQL database dump complete
--

